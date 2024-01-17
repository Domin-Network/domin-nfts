// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AuthorizerNFT} from "../tokens/AuthorizerNFT.sol";
import {OperatorNFT} from "../tokens/OperatorNFT.sol";

interface IDominVault {
    function getFeeBalance(
        AuthorizerNFT authorizer,
        uint256 authorizerTokenId
    ) external view returns (IERC20 token, uint256 amount);

    function getRedeemFee(
        AuthorizerNFT authorizer,
        uint256 authorizerTokenId
    ) external view returns (IERC20 token, uint256 amount);

    function getAuthorizerNFTReward(
        AuthorizerNFT authorizer,
        uint256 authorizerTokenId
    ) external view returns (IERC20 token, uint256 amount);

    function getOperatorNFTReward(
        OperatorNFT operator,
        uint256 operatorTokenId
    ) external view returns (IERC20 token, uint256 amount);

    function depositPrepaidFee(
        AuthorizerNFT authorizer,
        uint256 authorizerTokenId,
        uint256 amount
    ) external;

    function withdrawAuthorizerReward(
        AuthorizerNFT authorizer,
        uint256 authorizerTokenId,
        address to,
        IERC20 token,
        uint256 amount
    ) external;

    function withdrawOperatorReward(
        OperatorNFT operator,
        uint256 operatorTokenId,
        address to,
        IERC20 token,
        uint256 amount
    ) external;

    function payFees(
        AuthorizerNFT authorizer,
        uint256 authorizerTokenId,
        OperatorNFT operator,
        uint256 operatorTokenId,
        uint256 redemptionsCount
    ) external;
}
