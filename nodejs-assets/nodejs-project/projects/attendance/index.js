const path = require('path');
require('dotenv').config();
const fetch = require('node-fetch');
const cron = require('node-cron');
const fs = require('fs').promises;
const rn_bridge = require('rn-bridge');

let logger = console;
const SERVICE_NAME = 'attendance';
let serviceInstance = null;

const CONFIG = {
  KEKA_BASE_URL: 'https://telaverge.keka.com/v1',
  KEKA_WEBCLOCKIN_URL: 'https://telaverge.keka.com/k/dashboard/api/mytime/attendance/webclockin',
  EMPLOYEE_ID: process.env.KEKA_EMPLOYEE_ID || 'your-employee-id',
  AUTH_TOKEN: process.env.KEKA_AUTH_TOKEN || 'your-auth-token',
  ASK_CHECKOUT_TIME: '20 18 * * 1-5',
  TIMEZONE: 'Asia/Kolkata',
  STATE_FILE: path.join(__dirname, 'checkout-state.json'),
  SCHEDULE_FILE: path.join(__dirname, 'daily-schedule.json'),
  CHECK_IN_RANGE: { start: { hour: 9, minute: 15 }, end: { hour: 9, minute: 28 } },
  CHECK_OUT_RANGE: { start: { hour: 20, minute: 0 }, end: { hour: 22, minute: 0 } }
};

class AttendanceAutomation {
    constructor() {
        this.headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CONFIG.AUTH_TOKEN}` };
        this.pendingCheckoutPrompt = false;
        this.dailySchedule = null;
        this.cronJobs = [];
        this.latestStatus = {};
    }
    
    shutdown() {
        logger.log('🛑 Shutting down attendance service internals...');
        this.cronJobs.forEach(job => job.stop());
        this.cronJobs = [];
        logger.log('✅ Service internals shut down.');
    }

    async sendStatusUpdate() {
        try {
            this.latestStatus = {
                isHoliday: await this.isHoliday(), hasLeave: await this.hasLeaveToday(),
                isCheckedIn: await this.hasAlreadyCheckedIn(), isCheckedOut: await this.hasAlreadyCheckedOut(),
                schedule: this.dailySchedule
            };
            rn_bridge.channel.send(JSON.stringify({ type: 'STATUS_UPDATE', payload: this.latestStatus, projectName: SERVICE_NAME }));
        } catch (e) { logger.error(`Error sending status update: ${e.message}`) }
    }

    getOperationalDate() {
        const now = new Date();
        if (now.getHours() >= 23) {
            const tomorrow = new Date();
            tomorrow.setDate(now.getDate() + 1);
            return tomorrow;
        }
        return now;
    }

    async isHoliday() {
        try {
            const checkDate = this.getOperationalDate().toISOString().split('T')[0];
            const response = await fetch(`${CONFIG.KEKA_BASE_URL}/holidays?date=${checkDate}`, { method: 'GET', headers: this.headers });
            if (!response.ok) return false;
            const holidays = await response.json();
            return holidays.some(holiday => holiday.date === checkDate && holiday.isActive);
        } catch (error) { logger.error(`Error checking holidays: ${error.message}`); return false; }
    }

    async hasLeaveToday() {
        try {
            const checkDate = this.getOperationalDate().toISOString().split('T')[0];
            const response = await fetch(`${CONFIG.KEKA_BASE_URL}/leave/status/${CONFIG.EMPLOYEE_ID}?date=${checkDate}`, { method: 'GET', headers: this.headers });
            if (!response.ok) return false;
            const leaveData = await response.json();
            return leaveData.hasLeave || leaveData.status === 'APPROVED';
        } catch (error) { logger.error(`Error checking leave: ${error.message}`); return false; }
    }

    async hasAlreadyCheckedIn() {
        try {
            const checkDate = this.getOperationalDate().toISOString().split('T')[0];
            const response = await fetch(`${CONFIG.KEKA_BASE_URL}/attendance/status/${CONFIG.EMPLOYEE_ID}?date=${checkDate}`, { method: 'GET', headers: this.headers });
            if (!response.ok) return false;
            const attendanceData = await response.json();
            return attendanceData.clockInTime !== null;
        } catch (error) { logger.error(`Error checking attendance: ${error.message}`); return false; }
    }

    async hasAlreadyCheckedOut() {
        try {
            const checkDate = this.getOperationalDate().toISOString().split('T')[0];
            const response = await fetch(`${CONFIG.KEKA_BASE_URL}/attendance/status/${CONFIG.EMPLOYEE_ID}?date=${checkDate}`, { method: 'GET', headers: this.headers });
            if (!response.ok) return false;
            const attendanceData = await response.json();
            return attendanceData.clockOutTime !== null;
        } catch (error) { logger.error(`Error checking checkout status: ${error.message}`); return false; }
    }

    generateRandomTime(startTime, endTime) {
        const start = startTime.hour * 60 + startTime.minute;
        const end = endTime.hour * 60 + endTime.minute;
        const randomMinutes = Math.floor(Math.random() * (end - start + 1)) + start;
        return { hour: Math.floor(randomMinutes / 60), minute: randomMinutes % 60 };
    }
    
    formatTime24(timeObj) { return `${timeObj.hour.toString().padStart(2, '0')}:${timeObj.minute.toString().padStart(2, '0')}`; }

    formatTime12(timeObj) {
        const hour12 = timeObj.hour === 0 ? 12 : timeObj.hour > 12 ? timeObj.hour - 12 : timeObj.hour;
        const ampm = timeObj.hour >= 12 ? 'PM' : 'AM';
        return `${hour12}:${timeObj.minute.toString().padStart(2, '0')} ${ampm}`;
    }

    async generateDailySchedule() {
        const operationalDate = this.getOperationalDate();
        const operationalDateStr = operationalDate.toISOString().split('T')[0];
        if (this.dailySchedule && this.dailySchedule.date === operationalDateStr) return this.dailySchedule;

        this.dailySchedule = {
            date: operationalDateStr,
            checkIn: this.generateRandomTime(CONFIG.CHECK_IN_RANGE.start, CONFIG.CHECK_IN_RANGE.end),
            checkOut: this.generateRandomTime(CONFIG.CHECK_OUT_RANGE.start, CONFIG.CHECK_OUT_RANGE.end),
            generated: new Date().toISOString()
        };
        await this.saveDailySchedule();
        logger.log(`📅 New schedule for ${operationalDateStr}: IN @ ${this.formatTime12(this.dailySchedule.checkIn)}, OUT @ ${this.formatTime12(this.dailySchedule.checkOut)}`);
        return this.dailySchedule;
    }

    async saveDailySchedule() { try { await fs.writeFile(CONFIG.SCHEDULE_FILE, JSON.stringify(this.dailySchedule, null, 2)); } catch (e) { logger.error(`❌ Failed to save schedule: ${e.message}`); } }
    
    async loadDailySchedule() {
        try {
            const data = await fs.readFile(CONFIG.SCHEDULE_FILE, 'utf8');
            const schedule = JSON.parse(data);
            if (schedule.date === this.getOperationalDate().toISOString().split('T')[0]) {
                this.dailySchedule = schedule;
                logger.log(`✅ Loaded today's schedule.`);
            }
        } catch (e) { logger.log('ℹ️ No previous schedule found for today.'); }
    }

    async saveState() { try { await fs.writeFile(CONFIG.STATE_FILE, JSON.stringify({ pendingCheckoutPrompt: this.pendingCheckoutPrompt }, null, 2)); } catch (e) { logger.error(`❌ Failed to save state: ${e.message}`); } }

    async loadState() {
        try {
            const data = await fs.readFile(CONFIG.STATE_FILE, 'utf8');
            const state = JSON.parse(data);
            this.pendingCheckoutPrompt = state.pendingCheckoutPrompt || false;
            logger.log('✅ State loaded.');
        } catch (e) { logger.log('ℹ️ No previous state found.'); }
    }
    
    async clockIn() {
        try {
            const schedule = await this.generateDailySchedule();
            const checkInTime = schedule ? this.formatTime12(schedule.checkIn) : new Date().toLocaleTimeString();
            const clockInData = { "timestamp": new Date().toISOString(), "attendanceLogSource": 1, "locationAddress": null, "manualClockinType": 1, "note": `Automated check-in at ${checkInTime}`, "originalPunchStatus": 0 };
            const response = await fetch(CONFIG.KEKA_WEBCLOCKIN_URL, { method: 'POST', headers: this.headers, body: JSON.stringify(clockInData) });
            if (!response.ok) { const errorText = await response.text(); throw new Error(`Check-in failed: ${response.status} - ${errorText}`); }
            logger.log(`✅ Successfully checked in at ${new Date().toLocaleTimeString()}`);
            await this.sendStatusUpdate();
            return true;
        } catch (error) { logger.error(`❌ Check-in failed: ${error.message}`); await this.sendStatusUpdate(); return false; }
    }

    async clockOut(notes = 'Automated checkout') {
        try {
            const clockOutData = { "timestamp": new Date().toISOString(), "attendanceLogSource": 1, "locationAddress": null, "manualClockinType": 1, "note": notes, "originalPunchStatus": 1 };
            const response = await fetch(CONFIG.KEKA_WEBCLOCKIN_URL, { method: 'POST', headers: this.headers, body: JSON.stringify(clockOutData) });
            if (!response.ok) { const errorText = await response.text(); throw new Error(`Check-out failed: ${response.status} - ${errorText}`); }
            logger.log(`✅ Successfully checked out at ${new Date().toLocaleTimeString()}`);
            await this.sendStatusUpdate();
            return true;
        } catch (error) { logger.error(`❌ Check-out failed: ${error.message}`); await this.sendStatusUpdate(); return false; }
    }

    async scheduleCheckout(checkoutTime) {
        const delay = checkoutTime.getTime() - new Date().getTime();
        if (delay > 0) {
            logger.log(`⏰ Checkout scheduled for ${checkoutTime.toLocaleString()}`);
            setTimeout(() => this.clockOut(`Scheduled checkout`), delay);
        } else {
            await this.clockOut('Immediate checkout');
        }
    }

    async performDailyCheckIn() {
        logger.log('🔄 Starting daily check-in process...');
        const today = this.getOperationalDate();
        if (today.getDay() === 0 || today.getDay() === 6) return logger.log('⏭️ Skipping: Weekend');
        if (await this.isHoliday()) return logger.log('⏭️ Skipping: Holiday');
        if (await this.hasLeaveToday()) return logger.log('⏭️ Skipping: On leave');
        if (await this.hasAlreadyCheckedIn()) return logger.log('⏭️ Skipping: Already checked in');
        await this.clockIn();
    }

    async performScheduledCheckout() {
        logger.log('🔄 Performing scheduled checkout...');
        const today = this.getOperationalDate();
        if (today.getDay() === 0 || today.getDay() === 6) return;
        if (await this.isHoliday() || await this.hasLeaveToday()) return;
        if (!await this.hasAlreadyCheckedIn()) return;
        if (await this.hasAlreadyCheckedOut()) return;
        if (this.pendingCheckoutPrompt) return logger.log('⏭️ User response pending, skipping scheduled checkout');

        const schedule = await this.generateDailySchedule();
        const checkoutTime = schedule ? this.formatTime12(schedule.checkOut) : '8:00 PM';
        await this.clockOut(`Scheduled checkout at ${checkoutTime}`);
    }

    async scheduleToday() {
        const schedule = this.dailySchedule;
        if (!schedule || schedule.date !== this.getOperationalDate().toISOString().split('T')[0]) return;

        const now = new Date();
        const checkInDate = new Date();
        checkInDate.setHours(schedule.checkIn.hour, schedule.checkIn.minute, 0, 0);
        if (checkInDate > now && !(await this.hasAlreadyCheckedIn())) {
            setTimeout(() => this.performDailyCheckIn(), checkInDate.getTime() - now.getTime());
            logger.log(`⏰ Today's check-in scheduled for ${this.formatTime12(schedule.checkIn)}`);
        }

        const checkOutDate = new Date();
        checkOutDate.setHours(schedule.checkOut.hour, schedule.checkOut.minute, 0, 0);
        if (checkOutDate > now && !(await this.hasAlreadyCheckedOut())) {
            setTimeout(() => this.performScheduledCheckout(), checkOutDate.getTime() - now.getTime());
            logger.log(`⏰ Today's auto-checkout scheduled for ${this.formatTime12(schedule.checkOut)}`);
        }
    }

    async promptForCheckout() {
        logger.log('⏰ It\'s checkout time. Checking conditions...');
        if (await this.isHoliday() || await this.hasLeaveToday()) return logger.log('⏭️ Skipping checkout prompt: Holiday/Leave');
        if (!await this.hasAlreadyCheckedIn()) return logger.log('⏭️ Skipping checkout prompt: Not checked in');
        if (await this.hasAlreadyCheckedOut()) return logger.log('⏭️ Skipping checkout prompt: Already checked out');

        rn_bridge.channel.send(JSON.stringify({ type: 'SCHEDULE_LOCAL_NOTIFICATION', payload: { title: 'Time to Clock Out!', body: 'When would you like to clock out today? Tap to open the app and respond.' } }));

        this.pendingCheckoutPrompt = true;
        await this.saveState();
        const schedule = await this.generateDailySchedule();
        const scheduledTime = schedule ? this.formatTime12(schedule.checkOut) : '8:00 PM';
        const scheduledTime24 = schedule ? this.formatTime24(schedule.checkOut) : '20:00';
        
        const promptMessage = {
            id: `prompt-${Date.now()}`,
            text: `It's 6:20 PM! When would you like to clock out?\n\nI've scheduled a random checkout for you at **${scheduledTime}**.`,
            sender: 'assistant', isPrompt: true, promptType: 'CHECKOUT_TIME',
            promptOptions: [{ label: 'Clock Out Now', value: 'now' }, { label: `Use Scheduled (${scheduledTime})`, value: scheduledTime24 }]
        };
        rn_bridge.channel.send(JSON.stringify({ type: 'ADD_ASSISTANT_MESSAGE', payload: promptMessage }));
        logger.log('📲 Checkout prompt sent to Assistant chat UI.');
    }

    async scheduleCheckoutFromApp(timeString) {
        if (!this.pendingCheckoutPrompt) return logger.log('⚠️ Received checkout time from app, but not expecting it. Ignoring.');

        let checkoutTime;
        if (timeString === 'now') {
            checkoutTime = new Date();
        } else {
            const [hours, minutes] = timeString.split(':').map(Number);
            checkoutTime = new Date();
            checkoutTime.setHours(hours, minutes, 0, 0);
        }
        
        await this.scheduleCheckout(checkoutTime);
        logger.log(`✅ Checkout scheduled via app for: ${timeString}`);

        this.pendingCheckoutPrompt = false;
        await this.saveState();
        
        const confirmationMessage = {
            id: `conf-${Date.now()}`,
            text: `Okay, I've scheduled your checkout for **${this.formatTime12({hour: checkoutTime.getHours(), minute: checkoutTime.getMinutes()})}**. Have a great evening!`,
            sender: 'assistant'
        };
        rn_bridge.channel.send(JSON.stringify({ type: 'ADD_ASSISTANT_MESSAGE', payload: confirmationMessage }));
    }

    async startCronJobs() {
        logger.log('🚀 Starting Attendance Automation Engine...');
        await this.loadState();
        await this.loadDailySchedule();
        await this.generateDailySchedule();
        await this.scheduleToday();
        
        const checkoutQueryJob = cron.schedule(CONFIG.ASK_CHECKOUT_TIME, () => this.promptForCheckout(), { timezone: CONFIG.TIMEZONE });
        this.cronJobs.push(checkoutQueryJob);
        
        const dailyScheduleJob = cron.schedule('0 0 * * *', async () => {
            await this.generateDailySchedule();
            await this.scheduleToday();
        }, { timezone: CONFIG.TIMEZONE });
        this.cronJobs.push(dailyScheduleJob);

        logger.log('✅ Cron jobs scheduled successfully.');
        await this.sendStatusUpdate();
    }
}

function startService() {
    if (serviceInstance) {
        logger.log('Service is already running. Cannot start again.');
        return;
    }
    serviceInstance = new AttendanceAutomation();
    serviceInstance.startCronJobs();
    rn_bridge.channel.send(JSON.stringify({ type: 'SERVICE_STATUS', payload: { service: SERVICE_NAME, status: 'running' } }));
}

function stopService() {
    if (serviceInstance) {
        serviceInstance.shutdown();
        serviceInstance = null;
        rn_bridge.channel.send(JSON.stringify({ type: 'SERVICE_STATUS', payload: { service: SERVICE_NAME, status: 'stopped' } }));
    }
}

async function handleMessage(action) {
    if (!serviceInstance && action.type !== 'GET_FRESH_DATA') {
        logger.log(`Service '${SERVICE_NAME}' is stopped. Ignoring action: ${action.type}`);
        return;
    }
    
    switch(action.type) {
        case 'GET_FRESH_DATA':
             if (serviceInstance) await serviceInstance.sendStatusUpdate();
             break;
        case 'ACTION_CHECK_IN':
            if(serviceInstance) await serviceInstance.clockIn();
            break;
        case 'ACTION_CHECK_OUT':
            if(serviceInstance) await serviceInstance.clockOut('Manual checkout from app');
            break;
        case 'ACTION_SCHEDULE_CHECKOUT':
            if (serviceInstance && action.payload && action.payload.time) {
                await serviceInstance.scheduleCheckoutFromApp(action.payload.time);
            }
            break;
    }
}

/**
 * The init function, which will be called by app.js to inject the logger.
 */
function init(injectedLogger) {
  logger = injectedLogger;
}

module.exports = {
    init,
    startService,
    stopService,
    handleMessage,
};
