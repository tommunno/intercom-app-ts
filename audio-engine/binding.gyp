{
 "targets": [
   {
     #The name of the target, which will be the name of the compiled addon
     "target_name": "AudioEngine",
     #The source files for the addon
     "sources": ["AudioEngine.cpp", "Engine.cpp", "BufferedInputs.cpp", "Mixers.cpp", "BufferedInput.cpp", "Mixer.cpp", "Soundcard.cpp"],
     #Shells out to Node.js to get the include path for node-addon-api. One can then add the homebrew portaudio headers with "/opt/homebrew/include" or the locally included portaudio headers as shown below
     "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")", "<(module_root_dir)/deps/portaudio/include"],
     #Ensures that node-gyp will rebuild the addon when node-addon-api updates
     "dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
     "libraries": [
      #These required for PortAudio
      #These two lines work for getting the homebrew installed one
       #"-L/opt/homebrew/lib",
      #  "-lportaudio"
      #This line works for the locally included one
      "<(module_root_dir)/deps/portaudio/lib/libportaudio.dylib"
     ],
    #  "ldflags": ["-Wl,-rpath,@loader_path"],
    #This just copies the PortAudio dylib to next to our node addon in the build/Release directory, instead of us having to copy it manually
      "copies": [{ "files": ["deps/portaudio/lib/libportaudio.dylib"], "destination": "<(PRODUCT_DIR)" }],
       #Use C++17 for the addon, and -fexceptions to enable C++ exceptions.
     "cflags_cc": ["-std=c++20", "-fexceptions"],
     #Preprocessor define that informs node-addon-api you intend to use C++ exceptions so it compiles the throwing versions of its helpers.
     "defines": ["NODE_ADDON_API_CPP_EXCEPTIONS"],
     #When node-gyp generates an Xcode project under the hood, this flips the project-level switch for C++ exceptions. Redundant with -fexceptions in many setups, but this makes it bulletproof on macOS.
     "xcode_settings": { "GCC_ENABLE_CPP_EXCEPTIONS": "YES" },
                        #  "OTHER_LDFLAGS": [ "-Wl,-rpath,@loader_path" ] }
      #Running some commands after the build to replace the portaudio homebrew reference with the path of where our module is loaded from                
      "postbuilds": [{
        # Name shown in Xcode logs
        "postbuild_name": "rewrite_portaudio_dep",

        # Shell command(s) to run after linking
        "action": [
          "sh", "-c",
          "install_name_tool -change /opt/homebrew/opt/portaudio/lib/libportaudio.2.dylib @loader_path/libportaudio.dylib '<(PRODUCT_DIR)/AudioEngine.node' || true; "
          "install_name_tool -change @rpath/libportaudio.dylib @loader_path/libportaudio.dylib '<(PRODUCT_DIR)/AudioEngine.node' || true"
        ]
      }]
     
   }
 ]
}


# To see what library is actually loaded at runtime, run this:
# DYLD_PRINT_LIBRARIES=1 node app.js

# AFTER the build, we do this in command line (it's happening automatically for us in the postbuilds part above):
# This uses a macos tool to say, in our AudioEngine.node binary, replace the portaudio homebrew reference with the path of where our AudioEngine.node is loaded from. Same again in the other command.  The // true just is a command line thing, it means if that command fails carry on and do the next command anyway

# install_name_tool -change /opt/homebrew/opt/portaudio/lib/libportaudio.2.dylib \
#   @loader_path/libportaudio.dylib \
#   build/Release/AudioEngine.node || true

# install_name_tool -change @rpath/libportaudio.dylib \
#   @loader_path/libportaudio.dylib \
#   build/Release/AudioEngine.node || true

#In the final app, make sure that the dylib is next to our AudioEngine.node