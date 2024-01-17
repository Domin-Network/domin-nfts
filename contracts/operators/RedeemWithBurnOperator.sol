// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@domin-network/contracts/interface/IOperator.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

contract RedeemWithBurnOperator is IOperator {
    function redeem(Redemption calldata redemption) external override {
        redemption.token.redeem(
            redemption.redemptionId,
            redemption.tokenId,
            redemption.memo
        );
        ERC721Burnable(address(redemption.token)).burn(redemption.tokenId);
    }

    function safeRedeem(Redemption calldata redemption) external override {
        redemption.token.redeem(
            redemption.redemptionId,
            redemption.tokenId,
            redemption.memo
        );
        ERC721Burnable(address(redemption.token)).burn(redemption.tokenId);
    }
}
