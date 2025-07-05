/**
 * THIS FILE IS AUTOMATED.
 * It uses Metro's 'require.context' to trick the bundler into watching
 * our Node.js backend files. It should ONLY be imported in development mode.
 *
 * It works in two parts to avoid an error from Metro's static analysis:
 * 1. It requires safe files (like .json) from the root of the nodejs-project.
 * 2. It recursively requires ALL files from the `projects` subdirectory.
 *
 * This setup avoids `app.js`, which contains dynamic require statements that
 * would otherwise break the Metro build process.
 */

if (__DEV__) {
    try {
      // Context 1: Watch the root of the nodejs project, but NOT recursively.
      // We only look for safe file types like .json to avoid `app.js`.
      // @ts-ignore: require.context is a bundler feature, not a standard TS feature.
      require.context(
        './nodejs-assets/nodejs-project', 
        false, // non-recursive
        /\.json$/ // only watch .json files at the root
      );
  
      // Context 2: Watch the 'projects' subdirectory RECURSIVELY.
      // We watch all files here (.*) because they are all safe for Metro to analyze.
      // @ts-ignore: require.context is a bundler feature, not a standard TS feature.
    //   require.context(
    //     './nodejs-assets/nodejs-project/projects', 
    //     true, // recursive
    //     /.*/ // watch all files
    //   );
    } catch (e) {
      // This catch is a fallback, but require.context itself should not throw
      // runtime errors, as it's a build-time instruction.
      console.error('[NODE-HMR-LOADER] Failed to setup require.context:', e);
    }
  }