#include <napi.h>
#include <node_api.h>
#include "./include/AudioTypes.h"
#include "./include/PortAudioGlobal.hpp"
#include "./include/Logger.h"
#include <string>
#include <memory>
#include <utility>
#include "./include/Engine.h"
#include "./include/LevelInfo.h"
#include <stdexcept>
#include <iostream>
#include <functional>
#include <portaudio.h>
#include <cstdint> // For int32_t
#include <vector>

// ENGINE:
static std::unique_ptr<Engine> engine;

// LOGGING CALLBACK:
static std::shared_ptr<Napi::ThreadSafeFunction> g_logging_tsfn;
static std::function<void(std::string, std::string, bool)> g_log;

void Logger::LOG(std::string message, std::string type, bool toAdminPanel) noexcept
{
    if (g_log)
        g_log(std::move(message), std::move(type), toAdminPanel);
};

static void CleanupLoggingTsfn(void *)
{
    // We want to Release the tsfn and then reset the pointer
    if (g_logging_tsfn)
    {
        g_logging_tsfn->Abort();
        g_logging_tsfn.reset();
    }
}

// REGISTERING AUDIO CALLBACK:
static std::shared_ptr<Napi::ThreadSafeFunction> g_tsfn;

static void CleanupTsfn(void *)
{
    // We want to Release the tsfn and then reset the pointer
    if (g_tsfn)
    {
        g_tsfn->Release();
        g_tsfn.reset();
    }
}

// NAPI FUNCTIONS:

Napi::Value createEngine(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    // std::size_t numBufferedIo, int soundcardNumInputChannels, int soundcardNumOutputChannels, int soundcardDeviceId

    if (info.Length() < 4 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsNumber() || !info[3].IsNumber())
    {
        Napi::TypeError::New(env, "Expected four numbers as arguments").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    int numBufferedIo = info[0].As<Napi::Number>().Int32Value();
    int soundcardNumInputChannels = info[1].As<Napi::Number>().Int32Value();
    int soundcardNumOutputChannels = info[2].As<Napi::Number>().Int32Value();
    int soundcardDeviceId = info[3].As<Napi::Number>().Int32Value();

    if (numBufferedIo < 0 || soundcardNumInputChannels < 0 || soundcardNumOutputChannels < 0 || soundcardDeviceId < 0)
    {
        Napi::RangeError::New(env, "Number of buffered IO, soundcard input channels, soundcard output channels, and soundcard device ID must be non-negative").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    // Use static_cast to convert int to std::size_t
    std::size_t numBufferedIo_st = static_cast<std::size_t>(numBufferedIo);

    if (engine)
    {
        Napi::Error::New(env, "Engine already created").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    try
    {
        PortAudioGlobal::init();
        // Note: if the constructor throws, engine stays unchanged (strong exception safety).
        // Ie, engine remains as nullptr if the engine throws midway through
        engine = std::make_unique<Engine>(
            numBufferedIo_st,
            soundcardNumInputChannels,
            soundcardNumOutputChannels,
            soundcardDeviceId);

        Logger::LOG("Successfully created Audio Engine", Logger::Types::SUCCESS);
        return Napi::Boolean::New(env, true); // or return the engine handle/object if you expose one
    }
    catch (const std::exception &e)
    {
        // Turn C++ exception into a real JS Error with your message
        Napi::Error err = Napi::Error::New(env, e.what());
        // optional: add metadata
        err.Value().Set("name", "EngineConstructionError");
        err.Value().Set("code", "ERR_ENGINE_CONSTRUCT");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }
    catch (...)
    {
        Napi::Error err = Napi::Error::New(env, "Unknown native error during Engine construction");
        err.Value().Set("name", "EngineConstructionError");
        err.Value().Set("code", "ERR_ENGINE_CONSTRUCT_UNKNOWN");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }

    return env.Undefined();
}

// Helper:
static Napi::Object deviceToJs(Napi::Env env, const PaDeviceDescription &d)
{
    Napi::Object o = Napi::Object::New(env);
    o.Set("id", d.id);
    o.Set("name", d.name);
    o.Set("hostApiIndex", d.hostApiIndex);
    o.Set("hostApiName", d.hostApiName);

    o.Set("maxInputChannels", d.maxInputChannels);
    o.Set("maxOutputChannels", d.maxOutputChannels);

    o.Set("defaultLowInputLatency", d.defaultLowInputLatency);
    o.Set("defaultLowOutputLatency", d.defaultLowOutputLatency);
    o.Set("defaultHighInputLatency", d.defaultHighInputLatency);
    o.Set("defaultHighOutputLatency", d.defaultHighOutputLatency);

    o.Set("defaultSampleRate", d.defaultSampleRate);

    o.Set("isDefaultInput", d.isDefaultInput);
    o.Set("isDefaultOutput", d.isDefaultOutput);
    return o;
}

Napi::Value getPortAudioDevices(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    try
    {
        PortAudioGlobal::init();
        auto devices = PortAudioGlobal::getDeviceInfo();

        Napi::Array arr = Napi::Array::New(env, devices.size());
        for (size_t i = 0; i < devices.size(); ++i)
        {
            arr.Set(i, deviceToJs(env, devices[i]));
        }
        return arr;
    }
    catch (const std::exception &e)
    {
        Napi::Error err = Napi::Error::New(env, e.what());
        err.Value().Set("name", "PortAudioEnumerateError");
        err.Value().Set("code", "ERR_PA_ENUMERATION");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }
    catch (...)
    {
        Napi::Error err = Napi::Error::New(env, "Unknown error enumerating PortAudio devices");
        err.Value().Set("name", "PortAudioEnumerateError");
        err.Value().Set("code", "ERR_PA_ENUMERATION_UNKNOWN");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

// Helper
inline void i16_to_f32(const int16_t *src, float *dst, size_t n)
{
    constexpr float k = 1.0f / 32768.0f; // map [-32768,32767] -> [-1, 1)
    for (size_t i = 0; i < n; ++i)
        dst[i] = src[i] * k;
}

Napi::Value routeToBufferedInput(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (!engine)
    {
        Napi::Error::New(env, "Engine not created, so can't route to buffered input").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsTypedArray())
    {
        Napi::TypeError::New(env, "Expected (inputNumber, Int16Array)").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    int inputNumber = info[0].As<Napi::Number>().Int32Value();
    if (inputNumber < 0)
    {
        Napi::RangeError::New(env, "inputNumber must be >= 0").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    try
    {
        size_t inputNum = static_cast<size_t>(inputNumber);

        Napi::Int16Array i16 = info[1].As<Napi::Int16Array>();
        const int16_t *src = i16.Data();
        const size_t n = i16.ElementLength(); // samples (frames * channels)

        // Reuse a per-input scratch buffer to avoid re-allocs
        auto &bufferedInput = engine->bufferedInputs.getInput(inputNum);
        auto &tempBuffer = bufferedInput.tempBuffer; // std::vector<float> member
        tempBuffer.resize(n);
        i16_to_f32(src, tempBuffer.data(), n);

        bufferedInput.route(tempBuffer);
    }
    catch (const std::exception &e)
    {
        // Turn C++ exception into a real JS Error with your message
        Napi::Error err = Napi::Error::New(env, e.what());
        // optional: add metadata
        err.Value().Set("name", "RoutetoBufferedInputError");
        err.Value().Set("code", "ERR_INPUT_ROUTING");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }
    catch (...)
    {
        Napi::Error err = Napi::Error::New(env, "Unknown native error during routing to buffered input");
        err.Value().Set("name", "RoutetoBufferedInputError");
        err.Value().Set("code", "ERR_INPUT_ROUTING_UNKNOWN");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }

    return env.Undefined();
}

Napi::Value setBufferedInputRouted(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (!engine)
    {
        Napi::Error::New(env, "Engine not created, so can't set buffered input routed").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsBoolean())
    {
        Napi::TypeError::New(env, "Expected (inputNumber, routed)").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    int inputNumber = info[0].As<Napi::Number>().Int32Value();
    bool routed = info[1].As<Napi::Boolean>().Value();

    if (inputNumber < 0)
    {
        Napi::RangeError::New(env, "inputNumber must be >= 0").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    try
    {

        auto &bufferedInput = engine->bufferedInputs.getInput(static_cast<size_t>(inputNumber));
        bool isRouted = bufferedInput.setRouted(routed);
        return Napi::Boolean::New(env, isRouted);
    }
    catch (const std::exception &e)
    {
        // Turn C++ exception into a real JS Error with your message
        Napi::Error err = Napi::Error::New(env, e.what());
        // optional: add metadata
        err.Value().Set("name", "SetBufferedInputRoutedError");
        err.Value().Set("code", "ERR_INPUT_ROUTING");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }
    catch (...)
    {
        Napi::Error err = Napi::Error::New(env, "Unknown native error whilst setting the buffered input routed");
        err.Value().Set("name", "SetBufferedInputRoutedError");
        err.Value().Set("code", "ERR_INPUT_ROUTING_UNKNOWN");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value isBufferedInputRouted(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (!engine)
    {
        Napi::Error::New(env, "Engine not created, so can't check if buffered input is routed").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 1 || !info[0].IsNumber())
    {
        Napi::TypeError::New(env, "Expected (inputNumber)").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    int inputNumber = info[0].As<Napi::Number>().Int32Value();

    if (inputNumber < 0)
    {
        Napi::RangeError::New(env, "inputNumber must be >= 0").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    try
    {

        size_t inputNum = static_cast<size_t>(inputNumber);

        auto &bufferedInput = engine->bufferedInputs.getInput(inputNum);
        bool isRouted = bufferedInput.isRouted();
        return Napi::Boolean::New(env, isRouted);
    }
    catch (const std::exception &e)
    {
        // Turn C++ exception into a real JS Error with your message
        Napi::Error err = Napi::Error::New(env, e.what());
        // optional: add metadata
        err.Value().Set("name", "IsBufferedInputRoutedError");
        err.Value().Set("code", "ERR_INPUT_ROUTING");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }
    catch (...)
    {
        Napi::Error err = Napi::Error::New(env, "Unknown native error whilst checking if the buffered input is routed");
        err.Value().Set("name", "IsBufferedInputRoutedError");
        err.Value().Set("code", "ERR_INPUT_ROUTING_UNKNOWN");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value setInputGains(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (!engine)
    {
        Napi::Error::New(env, "Engine not created, so can't set input gains").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 1 || !info[0].IsArray())
    {
        Napi::TypeError::New(env, "Expected an array of input gains").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    try
    {
        Napi::Array gainsArray = info[0].As<Napi::Array>();
        static std::vector<int> inputGains;
        std::size_t expectedSize = engine->getNumInputs();
        if (inputGains.size() != expectedSize)
        {
            inputGains.resize(expectedSize);
        }

        if (gainsArray.Length() != expectedSize)
        {
            Napi::RangeError::New(env, "Gains array length must match number of inputs. Expected " + std::to_string(expectedSize) + " but got " + std::to_string(gainsArray.Length())).ThrowAsJavaScriptException();
            return env.Undefined();
        }

        for (uint32_t i = 0; i < gainsArray.Length(); ++i)
        {
            if (!gainsArray.Get(i).IsNumber())
            {
                Napi::TypeError::New(env, "All elements in the gains array must be numbers").ThrowAsJavaScriptException();
                return env.Undefined();
            }

            int gain = gainsArray.Get(i).As<Napi::Number>().Int32Value();
            if (gain < -50 || gain > 50)
            {
                Napi::RangeError::New(env, "Gain values must be between -50 and +50 dB").ThrowAsJavaScriptException();
                return env.Undefined();
            }
            inputGains[i] = gain;
        }
        engine->setInputGains(inputGains);
        return env.Undefined();
    }
    catch (const std::exception &e)
    {
        // Turn C++ exception into a real JS Error with your message
        Napi::Error err = Napi::Error::New(env, e.what());
        // optional: add metadata
        err.Value().Set("name", "SetInputGainsError");
        err.Value().Set("code", "ERR_SET_INPUT_GAINS");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }
    catch (...)
    {
        Napi::Error err = Napi::Error::New(env, "Unknown native error whilst setting the input gains");
        err.Value().Set("name", "SetInputGainsError");
        err.Value().Set("code", "ERR_SET_INPUT_GAINS_UNKNOWN");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

static inline void f32_to_i16(const float *src, int16_t *dst, size_t n)
{
    for (size_t i = 0; i < n; ++i)
    {
        float x = src[i];
        if (!std::isfinite(x))
            x = 0.0f;
        if (x > 1.0f)
            x = 1.0f;
        else if (x < -1.0f)
            x = -1.0f;
        // round to nearest to reduce bias
        int v = static_cast<int>(std::lrintf(x * 32767.0f));
        dst[i] = static_cast<int16_t>(v);
    }
}

Napi::Value registerAudioCallback(const Napi::CallbackInfo &info)
{

    Napi::Env env = info.Env();

    if (!engine)
    {
        Napi::Error::New(env, "Engine not created, so can't register audio callback").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 1 || !info[0].IsFunction())
    {
        Napi::TypeError::New(env, "Expected callback function in registerAudioCallback").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    // Check if a callback is already registered.
    if (g_tsfn)
    {
        Napi::Error::New(env, "The audio callback is already registered in registerAudioCallback.").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    Napi::Function cb = info[0].As<Napi::Function>();

    // 1) Create TSFN
    auto tsfn = Napi::ThreadSafeFunction::New(
        env,
        cb,
        "registerAudioCallback",
        /*maxQueueSize*/ 1, // coalescing notifier
        /*initialThreadCount*/ 1);

    auto tsfnPtr = std::make_shared<Napi::ThreadSafeFunction>(std::move(tsfn));
    g_tsfn = tsfnPtr;

    auto tsfnWeakPtr = std::weak_ptr<Napi::ThreadSafeFunction>(g_tsfn);

    // 2) Producer thread: push + notify (no payload)
    CallbackHandle handle = engine->soundcard.registerAudioCallback(10000, [tsfnWeakPtr](float * /*out*/, const float * /*in*/, unsigned long /*frames*/)
                                                                    {
        if (auto tsfnPtr = tsfnWeakPtr.lock())
        {

            struct Dummy
            {
            };
            static Dummy dummy;

            tsfnPtr->NonBlockingCall(
                // 3) Drain happens on the JS thread here:
                &dummy,
                // THIS FUNCTION IS THE ONE THAT RUNS ON THE MAIN THREAD!!!
                // Ie, WHENEVER this function below runs, we want to send ALL of the audio in the ring buffer
                // Because of queue being set to 1, the lambda runs only ONCE per enqueued callback, so we then send all audio
                [](Napi::Env env, Napi::Function jsCb, void *data)
                {
                        if(!engine) return; // Engine has been deleted, so just return
                        // Reuse a thread-local scratch to avoid reallocs each call
                        static thread_local std::vector<float> tmpF;
                        static thread_local std::vector<int16_t> tmpI16;
                    
                        try
                        {
                            const std::size_t vectorSize = 480 * engine->getNumBufferedIo();
                            tmpF.resize(vectorSize);
                            tmpI16.resize(vectorSize);

                            bool audioAvailable = true;
                            while (audioAvailable) {
                                audioAvailable = engine->getPlanarBufferedOutputAudio(tmpF);
                            if (audioAvailable)
                            {
                                f32_to_i16(tmpF.data(), tmpI16.data(), vectorSize);
                                auto buf = Napi::Buffer<int16_t>::Copy(env, tmpI16.data(), tmpI16.size());
                                jsCb.Call({buf});
                            }
                        }

                        }
                        catch (const Napi::Error &e)
                        {
                            auto stack = e.Value().Has("stack") ? e.Value().Get("stack").ToString().Utf8Value() : "";
                            fprintf(stderr, "[TSFN JS exception] %s\n%s\n",
                                    e.Message().c_str(), stack.empty() ? "(no stack)" : stack.c_str());
                        }
                        catch (const std::exception &e)
                        {
                            fprintf(stderr, "[TSFN std::exception] %s\n", e.what());
                        }
                        catch (...)
                        {
                            fprintf(stderr, "[TSFN unknown exception]\n");
                        }
                        if (env.IsExceptionPending())
                        {
                            Napi::Error err = env.GetAndClearPendingException();
                            auto stack = err.Value().Has("stack") ? err.Value().Get("stack").ToString().Utf8Value() : "";
                            fprintf(stderr, "[TSFN pending exception] %s\n%s\n",
                                    err.Message().c_str(), stack.empty() ? "(no stack)" : stack.c_str());
                        }

                        return;
                
                
                });
        } });

    // Add cleanup hook:
    napi_add_env_cleanup_hook(env, CleanupTsfn, nullptr);

    return Napi::Number::New(env, handle.id);
}

Napi::Value unregisterAudioCallback(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (!engine)
    {
        Napi::Error::New(env, "Engine not created, so can't unregister audio callback").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 1 || !info[0].IsNumber())
    {
        Napi::TypeError::New(env, "Expected callback ID in unregisterAudioCallback").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    // Check if a callback is already registered.
    if (!g_tsfn)
    {
        Napi::Error::New(env, "The audio callback is not registered in unregisterAudioCallback.").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    try
    {

        uint64_t callbackId =
            static_cast<uint64_t>(info[0].As<Napi::Number>().Int64Value());

        bool success = engine->soundcard.unregisterAudioCallback({callbackId});

        g_tsfn->Abort(); // stop accepting/processing calls immediately
        g_tsfn.reset();  // release the shared_ptr
        napi_remove_env_cleanup_hook(env, CleanupTsfn, nullptr);
        return Napi::Boolean::New(env, success);
    }
    catch (const std::exception &e)
    {
        // Turn C++ exception into a real JS Error with your message
        Napi::Error err = Napi::Error::New(env, e.what());
        // optional: add metadata
        err.Value().Set("name", "UnregisterAudioCallbackError");
        err.Value().Set("code", "ERR_AUDIO_CALLBACK_UNREGISTER");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }
    catch (...)
    {
        Napi::Error err = Napi::Error::New(env, "Unknown native error whilst unregistering audio callback");
        err.Value().Set("name", "UnregisterAudioCallbackError");
        err.Value().Set("code", "ERR_AUDIO_CALLBACK_UNREGISTER");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value updateMixerCrosspoint(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (!engine)
    {
        Napi::Error::New(env, "Engine not created, so can't update mixer crosspoint").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 3 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsBoolean())
    {
        Napi::TypeError::New(env, "Expected mixer ID, channel index, and state").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    std::size_t mixerId = info[0].As<Napi::Number>().Uint32Value();
    std::size_t channelIndex = info[1].As<Napi::Number>().Uint32Value();
    bool state = info[2].As<Napi::Boolean>().Value();

    if (mixerId < 0 || channelIndex < 0)
    {
        Napi::RangeError::New(env, "mixerId and channelIndex must be >= 0").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    try
    {
        engine->mixers.getMixer(mixerId).updateCrosspoint(channelIndex, state);
    }
    catch (const std::exception &e)
    {
        Napi::Error err = Napi::Error::New(env, e.what());
        // optional: add metadata
        err.Value().Set("name", "MixerCrosspointUpdateError");
        err.Value().Set("code", "ERR_MIXER_CROSSPOINT_UPDATE");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }
    catch (...)
    {
        Napi::Error err = Napi::Error::New(env, "Unknown native error during Mixer crosspoint update");
        err.Value().Set("name", "MixerCrosspointError");
        err.Value().Set("code", "ERR_MIXER_CROSSPOINT_UPDATE_UNKNOWN");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }

    return env.Undefined();
}

Napi::Value stopEngine(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsBoolean())
    {
        Napi::TypeError::New(env, "Expected boolean in stopEngine (terminatePortAudio)").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    bool terminatePortAudio = info[0].As<Napi::Boolean>().Value();

    std::string err;
    if (engine)
    {
        try
        {
            engine->stop();
        }
        catch (const std::exception &e)
        {
            err = e.what();
        }
    }

    if (terminatePortAudio)
    {
        Logger::LOG("Terminating PortAudio...", Logger::Types::INFO);
        PortAudioGlobal::terminateOnce();
    }

    CleanupTsfn(nullptr);

    // Now prevent the hook from firing later and releasing again
    napi_remove_env_cleanup_hook(env, CleanupTsfn, nullptr);

    // Resets to null ptr:
    engine.reset();

    if (!err.empty())
    {
        Napi::Error jsErr = Napi::Error::New(env, err);
        jsErr.Value().Set("name", "EngineStopError");
        jsErr.Value().Set("code", "ERR_ENGINE_STOP");
        jsErr.ThrowAsJavaScriptException();
        return env.Undefined();
    }

    return Napi::Boolean::New(env, true);
}

Napi::Value getInputLevelInfos(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (!engine)
    {
        Napi::Error::New(env, "Engine not created, so can't get input level info").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    try
    {
        std::vector<LevelInfo> bufferedInputLevels = engine->bufferedInputs.getInputLevelInfos();
        std::vector<LevelInfo> soundcardInputLevels = engine->soundcard.getInputLevelInfos();
        const uint32_t total = static_cast<uint32_t>(bufferedInputLevels.size() + soundcardInputLevels.size());

        Napi::Array arr = Napi::Array::New(env, total);

        for (uint32_t i = 0; i < total; ++i)
        {
            const LevelInfo &li = (i < bufferedInputLevels.size()) ? bufferedInputLevels[i] : soundcardInputLevels[i - bufferedInputLevels.size()];
            Napi::Object o = Napi::Object::New(env);
            o.Set("rmsDb", Napi::Number::New(env, static_cast<double>(li.rmsDb)));
            o.Set("peakDb", Napi::Number::New(env, static_cast<double>(li.peakDb)));
            arr.Set(i, o);
        }
        return arr;
    }
    catch (const std::exception &e)
    {
        Napi::Error err = Napi::Error::New(env, e.what());
        err.Value().Set("name", "GetInputLevelInfosError");
        err.Value().Set("code", "ERR_GET_INPUT_LEVEL_INFOS");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }
    catch (...)
    {
        Napi::Error err = Napi::Error::New(env, "Unknown error getting input level infos");
        err.Value().Set("name", "GetInputLevelInfosError");
        err.Value().Set("code", "ERR_GET_INPUT_LEVEL_INFOS_UNKNOWN");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

Napi::Value isSoundcardAlive(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (!engine)
    {
        Napi::Error::New(env, "Engine not created, so can't check if soundcard is alive").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    try
    {
        bool isAlive = engine->isSoundcardAlive();
        return Napi::Boolean::New(env, isAlive);
    }
    catch (const std::exception &e)
    {
        Napi::Error err = Napi::Error::New(env, e.what());
        err.Value().Set("name", "isSoundcardAliveError");
        err.Value().Set("code", "ERR_IS_SOUNDCARD_ALIVE");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }
    catch (...)
    {
        Napi::Error err = Napi::Error::New(env, "Unknown error checking if soundcard is alive");
        err.Value().Set("name", "isSoundcardAliveError");
        err.Value().Set("code", "ERR_IS_SOUNDCARD_ALIVE_UNKNOWN");
        err.ThrowAsJavaScriptException();
        return env.Undefined();
    }
}

// Only call this before creating engine, to avoid data races
Napi::Value addLoggingCallback(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (engine)
    {
        Napi::Error::New(env, "Logging callback must be added before creating the engine").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 1 || !info[0].IsFunction())
    {
        Napi::TypeError::New(env, "Expected callback function in addLoggingCallback").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    // Check if a callback is already registered, and if so, clean it up first
    if (g_logging_tsfn)
    {
        CleanupLoggingTsfn(nullptr);
        napi_remove_env_cleanup_hook(env, CleanupLoggingTsfn, nullptr);
    }

    Napi::Function cb = info[0].As<Napi::Function>();

    // 1) Create TSFN
    g_logging_tsfn = std::make_shared<Napi::ThreadSafeFunction>(
        Napi::ThreadSafeFunction::New(
            env,
            cb,
            "loggingCallback",
            /*maxQueueSize*/ 1024,   // max queue size of 1024 messages, drop if full
            /*initialThreadCount*/ 1 // 1 thread IN ADDITION to the main thread
            ));

    auto tsfnWeakPtr = std::weak_ptr<Napi::ThreadSafeFunction>(g_logging_tsfn);

    g_log = [tsfnWeakPtr](std::string message, std::string type, bool toAdminPanel)
    {
        if (auto tsfnPtr = tsfnWeakPtr.lock())
        {

            // auto *payload = new std::string(std::move(message));
            auto *payload = new Logger::LogPayload{std::move(message), std::move(type), toAdminPanel};

            napi_status status = tsfnPtr->NonBlockingCall(
                // This is what gets passed into the below lambda function
                payload,
                // THIS FUNCTION IS THE ONE THAT RUNS ON THE MAIN THREAD!!!
                [](Napi::Env env, Napi::Function jsCb, Logger::LogPayload *payload)
                {
                    try
                    {
                        Napi::String message = Napi::String::New(env, payload->message);
                        Napi::String type = Napi::String::New(env, payload->type);
                        Napi::Boolean toAdminPanel = Napi::Boolean::New(env, payload->toAdminPanel);
                        jsCb.Call({message, type, toAdminPanel});
                    }
                    catch (const Napi::Error &e)
                    {
                        auto stack = e.Value().Has("stack") ? e.Value().Get("stack").ToString().Utf8Value() : "";
                        fprintf(stderr, "[Logging TSFN JS exception] %s\n%s\n",
                                e.Message().c_str(), stack.empty() ? "(no stack)" : stack.c_str());
                    }
                    catch (const std::exception &e)
                    {
                        fprintf(stderr, "[Logging TSFN std::exception] %s\n", e.what());
                    }
                    catch (...)
                    {
                        fprintf(stderr, "[TSFN unknown exception]\n");
                    }
                    delete payload; // free payload
                    if (env.IsExceptionPending())
                    {
                        Napi::Error err = env.GetAndClearPendingException();
                        auto stack = err.Value().Has("stack") ? err.Value().Get("stack").ToString().Utf8Value() : "";
                        fprintf(stderr, "[TSFN pending exception] %s\n%s\n",
                                err.Message().c_str(), stack.empty() ? "(no stack)" : stack.c_str());
                    }
                });
            if (status != napi_ok)
                delete payload; // TSFN closed; avoid leak
        }
    };

    // Add cleanup hook:
    napi_add_env_cleanup_hook(env, CleanupLoggingTsfn, nullptr);

    return env.Undefined();
}

Napi::Object
Init(Napi::Env env, Napi::Object exports)
{
    exports.Set(Napi::String::New(env, "createEngine"), Napi::Function::New(env, createEngine));
    exports.Set(Napi::String::New(env, "stopEngine"), Napi::Function::New(env, stopEngine));
    exports.Set(Napi::String::New(env, "getPortAudioDevices"), Napi::Function::New(env, getPortAudioDevices));
    exports.Set(Napi::String::New(env, "routeToBufferedInput"), Napi::Function::New(env, routeToBufferedInput));
    exports.Set(Napi::String::New(env, "setBufferedInputRouted"), Napi::Function::New(env, setBufferedInputRouted));
    exports.Set(Napi::String::New(env, "isBufferedInputRouted"), Napi::Function::New(env, isBufferedInputRouted));
    exports.Set(Napi::String::New(env, "setInputGains"), Napi::Function::New(env, setInputGains));
    exports.Set(Napi::String::New(env, "registerAudioCallback"), Napi::Function::New(env, registerAudioCallback));
    exports.Set(Napi::String::New(env, "unregisterAudioCallback"), Napi::Function::New(env, unregisterAudioCallback));
    exports.Set(Napi::String::New(env, "updateMixerCrosspoint"), Napi::Function::New(env, updateMixerCrosspoint));
    exports.Set(Napi::String::New(env, "getInputLevelInfos"), Napi::Function::New(env, getInputLevelInfos));
    exports.Set(Napi::String::New(env, "isSoundcardAlive"), Napi::Function::New(env, isSoundcardAlive));
    exports.Set(Napi::String::New(env, "addLoggingCallback"), Napi::Function::New(env, addLoggingCallback));

    PortAudioGlobal::init();

    return exports;
};

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init);