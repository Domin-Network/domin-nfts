// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {IDominVault} from "../interfaces/IDominVault.sol";
import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AuthorizerNFT} from "../tokens/AuthorizerNFT.sol";
import {OperatorNFT} from "../tokens/OperatorNFT.sol";

contract DominVault is IDominVault, AccessManaged {
    error DominVaultForbiddenWithdraw(address caller);
    error DominVaultForbiddenPayFees(address caller);

    constructor(address manager) AccessManaged(manager) {}

    IERC20 public feeToken;
    uint256 public operatorReward = 50;
    uint256 public authorizerReward = 15;
    mapping(AuthorizerNFT => mapping(uint256 => mapping(IERC20 => uint256)))
        public feeAmounts;
    mapping(AuthorizerNFT => mapping(uint256 => mapping(IERC20 => uint256)))
        public prepaidFeeAmounts;
    mapping(AuthorizerNFT => mapping(uint256 => mapping(IERC20 => uint256)))
        public authorizerRewardAmounts;
    mapping(OperatorNFT => mapping(uint256 => mapping(IERC20 => uint256)))
        public operatorRewardAmounts;

    function getFeeBalance(
        AuthorizerNFT authorizer,
        uint256 authorizerTokenId
    ) external view returns (IERC20 token, uint256 amount) {
        return (
            feeToken,
            prepaidFeeAmounts[authorizer][authorizerTokenId][feeToken]
        );
    }

    function getRedeemFee(
        AuthorizerNFT authorizer,
        uint256 authorizerTokenId
    ) external view returns (IERC20 token, uint256 amount) {
        return (feeToken, feeAmounts[authorizer][authorizerTokenId][feeToken]);
    }

    function getAuthorizerNFTReward(
        AuthorizerNFT authorizer,
        uint256 authorizerTokenId
    ) external view returns (IERC20 token, uint256 amount) {
        return (
            feeToken,
            authorizerRewardAmounts[authorizer][authorizerTokenId][feeToken]
        );
    }

    function getOperatorNFTReward(
        OperatorNFT operator,
        uint256 operatorTokenId
    ) external view returns (IERC20 token, uint256 amount) {
        return (
            feeToken,
            operatorRewardAmounts[operator][operatorTokenId][feeToken]
        );
    }

    function depositPrepaidFee(
        AuthorizerNFT authorizer,
        uint256 authorizerTokenId,
        uint256 amount
    ) external {
        prepaidFeeAmounts[authorizer][authorizerTokenId][feeToken] += amount;
        bool transferSuccessful = feeToken.transferFrom(
            msg.sender,
            address(this),
            amount
        );
        if (!transferSuccessful) {
            revert DominVaultForbiddenWithdraw(msg.sender);
        }
    }

    function withdrawAuthorizerReward(
        AuthorizerNFT authorizer,
        uint256 authorizerTokenId,
        address to,
        IERC20 token,
        uint256 amount
    ) external restricted {
        if (
            authorizerRewardAmounts[authorizer][authorizerTokenId][token] <
            amount
        ) {
            revert DominVaultForbiddenWithdraw(msg.sender);
        } else {
            authorizerRewardAmounts[authorizer][authorizerTokenId][
                token
            ] -= amount;
            feeToken.transfer(to, amount);
        }
    }

    function withdrawOperatorReward(
        OperatorNFT operator,
        uint256 operatorTokenId,
        address to,
        IERC20 token,
        uint256 amount
    ) external restricted {
        if (operatorRewardAmounts[operator][operatorTokenId][token] < amount) {
            revert DominVaultForbiddenWithdraw(msg.sender);
        } else {
            operatorRewardAmounts[operator][operatorTokenId][token] -= amount;
            feeToken.transfer(to, amount);
        }
    }

    function payFees(
        AuthorizerNFT authorizer,
        uint256 authorizerTokenId,
        OperatorNFT operator,
        uint256 operatorTokenId,
        uint256 redemptionsCount
    ) external restricted {
        uint256 totalFeeAmount = feeAmounts[authorizer][authorizerTokenId][
            feeToken
        ] * redemptionsCount;
        if (
            prepaidFeeAmounts[authorizer][authorizerTokenId][feeToken] <
            totalFeeAmount
        ) {
            revert DominVaultForbiddenPayFees(msg.sender);
        }
        prepaidFeeAmounts[authorizer][authorizerTokenId][
            feeToken
        ] -= totalFeeAmount;
        operatorRewardAmounts[operator][operatorTokenId][feeToken] +=
            (totalFeeAmount * operatorReward) /
            100;
        authorizerRewardAmounts[authorizer][authorizerTokenId][feeToken] +=
            (totalFeeAmount * authorizerReward) /
            100;
    }

    function setFeeToken(IERC20 _feeToken) external restricted {
        feeToken = _feeToken;
    }

    function setOperatorReward(uint256 _operatorReward) external restricted {
        operatorReward = _operatorReward;
    }

    function setAuthorizerReward(
        uint256 _authorizerReward
    ) external restricted {
        authorizerReward = _authorizerReward;
    }

    function setFeeAmount(
        AuthorizerNFT authorizer,
        uint256 authorizerTokenId,
        uint256 amount
    ) external restricted {
        feeAmounts[authorizer][authorizerTokenId][feeToken] = amount;
    }

    function setPrepaidFeeAmount(
        AuthorizerNFT authorizer,
        uint256 authorizerTokenId,
        uint256 amount
    ) external restricted {
        prepaidFeeAmounts[authorizer][authorizerTokenId][feeToken] = amount;
    }

    function setAuthorizerRewardAmount(
        AuthorizerNFT authorizer,
        uint256 authorizerTokenId,
        uint256 amount
    ) external restricted {
        authorizerRewardAmounts[authorizer][authorizerTokenId][
            feeToken
        ] = amount;
    }

    function setOperatorRewardAmount(
        OperatorNFT operator,
        uint256 operatorTokenId,
        uint256 amount
    ) external restricted {
        operatorRewardAmounts[operator][operatorTokenId][feeToken] = amount;
    }
}
