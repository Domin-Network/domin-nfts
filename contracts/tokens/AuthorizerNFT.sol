// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";
import {AccessManager} from "@openzeppelin/contracts/access/manager/AccessManager.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {ERC6672, ERC721} from "@domin-network/contracts/token/ERC6672.sol";
import {OperatorNFT, IOperator} from "./OperatorNFT.sol";
import {IDominVault} from "../interfaces/IDominVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AuthorizerNFT is ERC6672, ERC721Burnable, ERC2981, AccessManaged {
    error AuthorizerNFTForbiddenRedeem(address caller);
    error AuthorizerNFTForbiddenRedeemOperatorNFT(address caller);
    error AuthorizerNFTForbiddenWithdraw(address caller);
    error AuthorizerNFTForbiddenRedeemFee(address caller);
    error AuthorizerNFTForbiddenTransfer(uint256 tokenId);

    uint256 private _tokenIdCounter;
    OperatorNFT private immutable _operatorNFT;
    string private baseURI;
    IDominVault private _vault;

    mapping(uint256 => bool) private _isLocked;

    modifier tokenAuthorized(uint256 tokenId) {
        if (_isAuthorized(ownerOf(tokenId), _msgSender(), tokenId) == false) {
            revert AuthorizerNFTForbiddenRedeem(_msgSender());
        }
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        address receiver,
        uint96 feeNumerator,
        address manager,
        address vault
    ) ERC721(_name, _symbol) AccessManaged(manager) {
        _tokenIdCounter = 1;
        _setDefaultRoyalty(receiver, feeNumerator);
        _operatorNFT = new OperatorNFT(
            "OperatorNodeNFT",
            "OPNFT",
            receiver,
            feeNumerator,
            manager
        );
        _vault = IDominVault(vault);
    }

    function safeMint(address to) external restricted {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _safeMint(to, tokenId);
    }

    function safeMintOperatorNFT(
        uint256 authorizerTokenId,
        address to
    ) external tokenAuthorized(authorizerTokenId) {
        _operatorNFT.safeMint(authorizerTokenId, to);
    }

    function getOperatorNFTAddress() external view returns (address) {
        return address(_operatorNFT);
    }

    function redeemRedemptions(
        uint256 authorizerTokenId,
        uint256 operatorTokenId,
        IOperator.Redemption[] calldata redemptions
    ) external tokenAuthorized(authorizerTokenId) {
        if (
            _operatorNFT.getAuthorizerTokenId(operatorTokenId) !=
            authorizerTokenId
        ) {
            revert AuthorizerNFTForbiddenRedeemOperatorNFT(_msgSender());
        }
        (IERC20 feeToken, uint256 feeAmount) = _vault.getRedeemFee(
            this,
            authorizerTokenId
        );
        uint256 feeAmounts = feeAmount * redemptions.length;
        (, uint256 vaultFeeBalance) = _vault.getFeeBalance(
            this,
            authorizerTokenId
        );
        if (vaultFeeBalance < feeAmounts) {
            bool transferSuccessful = feeToken.transferFrom(
                _msgSender(),
                address(this),
                feeAmounts
            );
            if (!transferSuccessful) {
                revert AuthorizerNFTForbiddenRedeemFee(_msgSender());
            }
            _vault.depositPrepaidFee(this, authorizerTokenId, feeAmounts);
        }
        for (uint256 i = 0; i < redemptions.length; i++) {
            _operatorNFT.operatorRedeem(operatorTokenId, redemptions[i]);
        }
        _vault.payFees(
            this,
            authorizerTokenId,
            _operatorNFT,
            operatorTokenId,
            redemptions.length
        );
    }

    function verifyOperator(
        uint256 authorizerTokenId,
        address operator,
        bool isVerified
    ) external tokenAuthorized(authorizerTokenId) {
        _operatorNFT.verifyOperator(IOperator(operator), isVerified);
    }

    function setRoyalty(
        address receiver,
        uint96 feeNumerator
    ) external restricted {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function setBaseURI(string memory _baseURI_) external restricted {
        baseURI = _baseURI_;
    }

    function setVault(IDominVault vault) external restricted {
        _vault = vault;
    }

    function revoke(uint256 tokenId) external restricted {
        transferFrom(ownerOf(tokenId), address(this), tokenId);
    }

    function lock(uint256 tokenId, bool isLocked) external restricted {
        _isLocked[tokenId] = isLocked;
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override(ERC6672, ERC721) returns (address) {
        if (_isLocked[tokenId]) {
            revert AuthorizerNFTForbiddenTransfer(tokenId);
        }
        return ERC6672._update(to, tokenId, auth);
    }

    function _randomRedemptionId() internal view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(block.prevrandao, block.timestamp, msg.sender)
            );
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function _increaseBalance(
        address account,
        uint128 amount
    ) internal virtual override(ERC6672, ERC721) {
        ERC6672._increaseBalance(account, amount);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC6672, ERC2981) returns (bool) {
        return
            interfaceId == type(ERC721).interfaceId ||
            interfaceId == type(ERC2981).interfaceId ||
            interfaceId == type(ERC6672).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
