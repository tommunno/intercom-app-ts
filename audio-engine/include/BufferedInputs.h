#ifndef INPUTS_H
#define INPUTS_H

#include <vector>
#include "./BufferedInput.h"
#include "LevelInfo.h"

class Engine; // <-- forward declare (no include of Engine.h here)

class BufferedInputs
{
    Engine &engine_;
    size_t numBufferedInputs_;
    // std::vector<Input> inputs_;
    std::vector<std::unique_ptr<BufferedInput>> bufferedInputs_;

public:
    BufferedInputs(Engine &engine, size_t numBufferedInputs);
    void start();
    BufferedInput &getInput(size_t inputNumber);
    std::vector<float> getInputLevels() const;
    std::vector<LevelInfo> getInputLevelInfos() const;
};

#endif