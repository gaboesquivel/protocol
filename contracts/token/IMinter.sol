pragma solidity ^0.4.17;


contract IMinter {
    event NewInflation(uint256 inflation);
    event SetCurrentRewardTokens(uint256 mintableTokens, uint256 redistributableTokens);

    function createReward(uint256 _fracNum, uint256 _fracDenom) external returns (uint256);
    function transferTokens(address _to, uint256 _amount) external;
    function addToRedistributionPool(uint256 _amount) external;
    function setCurrentRewardTokens() external;
}
