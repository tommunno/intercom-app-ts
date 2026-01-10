#pragma once
#include "./Logger.h"
#include <portaudio.h>
#include <stdexcept>
#include <string>
#include <cstdlib>
#include <iostream>
#include <vector>

class PortAudioGlobal
{
public:
    static void init()
    {
        if (initialized_)
            return;
        PaError err = Pa_Initialize();
        if (err != paNoError)
            throw std::runtime_error(Pa_GetErrorText(err));
        initialized_ = true;

        // register atexit only once
        if (!atexitRegistered_)
        {
            std::atexit([]
                        {
                if (initialized_) {
                    Pa_Terminate();
                    initialized_ = false;
                } });
            atexitRegistered_ = true;
        }
    }

    static void terminateOnce()
    {
        if (!initialized_)
            return;
        Pa_Terminate(); // assume all streams are already closed
        initialized_ = false;
    }

    static bool isInitialized() { return initialized_; }

    static void printDeviceInfo()
    {
        int numDevices;
        numDevices = Pa_GetDeviceCount();
        const PaDeviceInfo *deviceInfo;

        for (int i = 0; i < numDevices; i++)
        {
            deviceInfo = Pa_GetDeviceInfo(i);
            const PaHostApiInfo *hai = Pa_GetHostApiInfo(deviceInfo->hostApi);
            std::cout << "PortAudio Device " << i << ":\n";
            std::cout << "name: " << deviceInfo->name << "\n";
            std::cout << "hostApi: " << (hai ? hai->name : "(unknown)") << "\n";
            std::cout << "maxInputChannels: " << deviceInfo->maxInputChannels << "\n";
            std::cout << "maxOutputChannels: " << deviceInfo->maxOutputChannels << "\n";
            std::cout << "defaultLowInputLatency: " << deviceInfo->defaultLowInputLatency << "\n";
            std::cout << "defaultLowOutputLatency: " << deviceInfo->defaultLowOutputLatency << "\n";
            std::cout << "defaultHighInputLatency: " << deviceInfo->defaultHighInputLatency << "\n";
            std::cout << "defaultHighOutputLatency: " << deviceInfo->defaultHighOutputLatency << "\n";
            std::cout << "defaultSampleRate: " << deviceInfo->defaultSampleRate << "\n\n";
        }
    }

    static std::vector<PaDeviceDescription> getDeviceInfo()
    {
        int numDevices = Pa_GetDeviceCount();
        if (numDevices < 0)
        {
            throw std::runtime_error(std::string("Pa_GetDeviceCount failed: ") +
                                     Pa_GetErrorText((PaError)numDevices));
        }

        int defaultIn = Pa_GetDefaultInputDevice();
        int defaultOut = Pa_GetDefaultOutputDevice();

        std::vector<PaDeviceDescription> out;
        out.reserve(static_cast<size_t>(numDevices));

        for (int i = 0; i < numDevices; ++i)
        {
            const PaDeviceInfo *di = Pa_GetDeviceInfo(i);
            if (!di)
                continue;

            const PaHostApiInfo *hai = Pa_GetHostApiInfo(di->hostApi);

            PaDeviceDescription d{};
            d.id = i;
            d.name = di->name ? di->name : "";
            d.hostApiIndex = di->hostApi;
            d.hostApiName = (hai && hai->name) ? hai->name : "(unknown)";

            d.maxInputChannels = di->maxInputChannels;
            d.maxOutputChannels = di->maxOutputChannels;

            d.defaultLowInputLatency = di->defaultLowInputLatency;
            d.defaultLowOutputLatency = di->defaultLowOutputLatency;
            d.defaultHighInputLatency = di->defaultHighInputLatency;
            d.defaultHighOutputLatency = di->defaultHighOutputLatency;

            d.defaultSampleRate = di->defaultSampleRate;

            d.isDefaultInput = (i == defaultIn);
            d.isDefaultOutput = (i == defaultOut);

            out.push_back(std::move(d));
        }

        return out;
    }

private:
    static bool initialized_;
    static bool atexitRegistered_;
};

inline bool PortAudioGlobal::initialized_ = false;
inline bool PortAudioGlobal::atexitRegistered_ = false;
