#include <vector>
#include "./include/BufferedInput.h"
#include "./include/BufferedInputs.h"
#include "./include/Engine.h"
#include "./include/Logger.h"
#include <stdexcept>

BufferedInputs::BufferedInputs(Engine &engine, size_t numBufferedInputs) : engine_(engine), numBufferedInputs_(numBufferedInputs), bufferedInputs_(std::vector<std::unique_ptr<BufferedInput>>())
{
    bufferedInputs_.reserve(numBufferedInputs);

    for (size_t i = 0; i < numBufferedInputs_; ++i)
    {
        bufferedInputs_.emplace_back(std::make_unique<BufferedInput>(engine_, i));
    }
}

void BufferedInputs::start()
{
    for (auto &input : bufferedInputs_)
    {
        input->start();
    }
}

BufferedInput &BufferedInputs::getInput(size_t inputNumber)
{
    if (inputNumber >= numBufferedInputs_)
    {
        throw std::out_of_range("Input number out of range");
    }
    return *bufferedInputs_[inputNumber];
}

std::vector<float> BufferedInputs::getInputLevels() const
{
    std::vector<float> levels;
    levels.reserve(bufferedInputs_.size());

    for (const auto &inputPtr : bufferedInputs_)
    {
        levels.push_back(inputPtr->getRmsDb());
    }

    return levels;
}

std::vector<LevelInfo> BufferedInputs::getInputLevelInfos() const
{
    std::vector<LevelInfo> levelInfos;
    levelInfos.reserve(bufferedInputs_.size());

    for (const auto &inputPtr : bufferedInputs_)
    {
        levelInfos.push_back(inputPtr->getLevelInfo());
    }

    return levelInfos;
}
