#ifndef AUDIOTYPES_H
#define AUDIOTYPES_H

#include <cstdint>    // Required for uint64_t
#include <functional> // Required for std::function
#include <iostream>

using AudioFn = std::function<void(float *out, const float *in, unsigned long frames)>;

struct CallbackHandle
{
    uint64_t id = 0;
};

struct PaDeviceDescription
{
    int id;
    std::string name;
    int hostApiIndex;
    std::string hostApiName;

    int maxInputChannels;
    int maxOutputChannels;

    // Seconds (same as PortAudio's PaTime)
    double defaultLowInputLatency;
    double defaultLowOutputLatency;
    double defaultHighInputLatency;
    double defaultHighOutputLatency;

    double defaultSampleRate;

    bool isDefaultInput;
    bool isDefaultOutput;
};

#endif // AUDIOTYPES_H