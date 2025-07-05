#!/bin/bash

# A powerful script to handle the entire local build and run process
# for an Expo project with custom native code.

# --- Style Definitions ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# --- Configuration ---
KEYSTORE_NAME="my-release-key.keystore"
KEYSTORE_ALIAS="my-key-alias"
KEYSTORE_PASS="android123" # A simple default password for development
APP_NAME="Assistant"

# --- Helper function to check if a command exists ---
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# --- Main Script ---

echo -e "${YELLOW}A 'development build' is a custom version of your app with all native code."
echo -e "You only need to build the first time, or after adding/updating native libraries.${NC}"
read -p "Do you need to create a new local development build for Android? (y/N) " choice
choice=${choice:-n}

if [[ "$choice" == "y" || "$choice" == "Y" ]]; then
  echo -e "\n${BLUE}--- Starting Local Build Setup ---${NC}"

  # Step 1: Check for Java Keytool
  if ! command_exists keytool; then
    echo -e "${RED}Error: 'keytool' command not found. Please ensure you have a JDK installed and JAVA_HOME is set.${NC}"
    exit 1
  fi
  
  # Step 2: Run prebuild if the 'android' directory doesn't exist
  if [ ! -d "android" ]; then
    echo -e "\n${YELLOW}[1/5] 'android' directory not found. Running 'npx expo prebuild'...${NC}"
    npx expo prebuild --platform android --no-install
    if [ $? -ne 0 ]; then
      echo -e "${RED}Error during 'expo prebuild'. Please resolve the issues and try again.${NC}"
      exit 1
    fi
  else
    echo -e "\n${GREEN}[1/5] 'android' directory already exists. Skipping prebuild.${NC}"
  fi

  # Step 3: Patch android/app/build.gradle to fix architecture build issue
  APP_GRADLE_FILE="android/app/build.gradle"
  if ! grep -q "splits" "$APP_GRADLE_FILE"; then
    echo -e "\n${YELLOW}[2/5] Patching '$APP_GRADLE_FILE' to specify ARM architectures...${NC}"
    # Using sed to insert the splits block after the buildTypes block
    sed -i "/buildTypes {/,/}/a \\
    // FIX: Specify ARM architectures to bypass x86 build issues with nodejs-mobile\\
    splits {\\
        abi {\\
            enable true\\
            reset()\\
            include \"armeabi-v7a\", \"arm64-v8a\"\\
            universalApk false\\
        }\\
    }\\
    packagingOptions {\\
        pickFirst 'lib/armeabi-v7a/libnode.so'\\
        pickFirst 'lib/arm64-v8a/libnode.so'\\
    }" "$APP_GRADLE_FILE"
    echo -e "${GREEN}Patch applied successfully.${NC}"
  else
    echo -e "\n${GREEN}[2/5] Build script already patched. Skipping.${NC}"
  fi

  # Step 4: Create Keystore and gradle.properties if they don't exist
  GRADLE_PROPS_FILE="android/gradle.properties"
  KEYSTORE_FILE="android/app/$KEYSTORE_NAME"
  if [ ! -f "$KEYSTORE_FILE" ]; then
    echo -e "\n${YELLOW}[3/5] Keystore not found. Generating a new one...${NC}"
    keytool -genkey -v -keystore "$KEYSTORE_FILE" -alias "$KEYSTORE_ALIAS" \
      -keyalg RSA -keysize 2048 -validity 10000 \
      -storepass "$KEYSTORE_PASS" -keypass "$KEYSTORE_PASS" \
      -dname "CN=Dev, OU=Dev, O=Dev, L=Dev, S=Dev, C=US" # Non-interactive details
    
    echo -e "\n${YELLOW}[4/5] Creating 'gradle.properties' with keystore credentials...${NC}"
    # Use printf to avoid issues with special characters and ensure a newline
    printf "\nMYAPP_RELEASE_STORE_FILE=%s\n" "$KEYSTORE_NAME" >> "$GRADLE_PROPS_FILE"
    printf "MYAPP_RELEASE_KEY_ALIAS=%s\n" "$KEYSTORE_ALIAS" >> "$GRADLE_PROPS_FILE"
    printf "MYAPP_RELEASE_STORE_PASSWORD=%s\n" "$KEYSTORE_PASS" >> "$GRADLE_PROPS_FILE"
    printf "MYAPP_RELEASE_KEY_PASSWORD=%s\n" "$KEYSTORE_PASS" >> "$GRADLE_PROPS_FILE"

    echo -e "\n${YELLOW}[5/5] Configuring 'build.gradle' to use release signing config...${NC}"
    sed -i "/signingConfigs {/,/}/a \\
        release {\\
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {\\
                storeFile file(MYAPP_RELEASE_STORE_FILE)\\
                storePassword MYAPP_RELEASE_STORE_PASSWORD\\
                keyAlias MYAPP_RELEASE_KEY_ALIAS\\
                keyPassword MYAPP_RELEASE_KEY_PASSWORD\\
            }\\
        }" "$APP_GRADLE_FILE"
    sed -i "s/signingConfig signingConfigs.debug/signingConfig signingConfigs.release/g" "$APP_GRADLE_FILE"
    
    echo -e "${GREEN}Keystore and signing configuration complete.${NC}"
  else
    echo -e "\n${GREEN}[3-5/5] Keystore and signing config already exist. Skipping setup.${NC}"
  fi

  # Step 5: Run the local build
  echo -e "\n${BLUE}--- All checks passed. Starting the final local build ---${NC}"
  eas build --platform android --profile development --local

  # After build, find the APK
  if [ $? -eq 0 ]; then
    APK_PATH=$(find . -name "*.apk" | head -n 1)
    echo -e "\n${GREEN}✅ BUILD SUCCESSFUL! ✅${NC}"
    echo -e "You can find the installable app at:${YELLOW} $APK_PATH ${NC}"
    echo -e "To install it on a connected device, run:"
    echo -e "${YELLOW} adb install \"$APK_PATH\" ${NC}"
    echo -e "\nAfter installing, run this script again and answer 'n' to start the server."
  else
    echo -e "\n${RED}❌ BUILD FAILED. Please check the logs above for errors. ❌${NC}"
  fi
  
  exit 0
fi


# --- Step to run the server ---
echo -e "\n${BLUE}Starting the development server for your custom app...${NC}"
IP_ADDRESS=$(hostname -I | awk '{print $1}')

if [ -z "$IP_ADDRESS" ]; then
  echo -e "${RED}Error: Could not determine local IP address.${NC}"
  exit 1
fi

PORT="8081"
echo -e "\n${GREEN}======================================================"
echo -e "  ✅ Server Ready!"
echo -e "  Open the '${GREEN}$APP_NAME${NC}' app on your physical device."
echo -e "  It should connect to this server at:"
echo -e "  URL: ${YELLOW}http://${IP_ADDRESS}:${PORT}${NC}"
echo -e "======================================================${NC}\n"

npx expo start --dev-client -c