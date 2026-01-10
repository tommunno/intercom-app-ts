#ifndef MIXERS_H
#define MIXERS_H

#include <vector>
#include "./Mixer.h"
#include <functional>

class Engine; // <-- forward declare (no include of Engine.h here)

class Mixers
{
    Engine &engine_;
    std::size_t numMixers_;
    std::vector<Mixer> mixers_;

public:
    Mixers(Engine &engine, std::size_t numBufferedIo, int soundcardNumInputChannels, int soundcardNumOutputChannels);
    void start();
    Mixer &getMixer(std::size_t mixerId);
    // void routeMixerOutput(int mixerId, std::function<void(const std::vector<int16_t> &)> mixerCallback);
};

#endif