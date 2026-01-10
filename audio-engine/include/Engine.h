

#ifndef ENGINE_H
#define ENGINE_H

#include "./BufferedInputs.h"
#include "./Mixers.h"
#include "./Soundcard.h"
#include "./RingBuffer.hpp"
#include "./Mixer.h"
#include <vector>
#include "AudioTypes.h"

class Engine
{
    std::size_t numBufferedIo_;
    int soundcardNumInputChannels_;
    int soundcardNumOutputChannels_;
    int soundcardDeviceId_;
    bool stopped_ = false;

public:
    Mixers mixers;
    Soundcard soundcard;
    BufferedInputs bufferedInputs;

    Engine(std::size_t numBufferedInputs, int soundcardNumInputChannels, int soundcardNumOutputChannels, int soundcardDeviceId);

    void start();

    bool getPlanarBufferedOutputAudio(std::vector<float> &out);

    std::size_t getNumBufferedIo() const;

    std::size_t getNumInputs() const;

    void setInputGains(const std::vector<int> &gains);

    bool isSoundcardAlive();

    void stop();
};

#endif