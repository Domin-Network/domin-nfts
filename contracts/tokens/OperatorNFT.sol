// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";
import {AccessManager} from "@openzeppelin/contracts/access/manager/AccessManager.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {ERC6672, ERC721, IERC6672} from "@domin-network/contracts/token/ERC6672.sol";
import {IOperator} from "@domin-network/contracts/interface/IOperator.sol";

contract OperatorNFT is ERC6672, ERC721Burnable, ERC2981, AccessManaged {
    error OperatorNFTForbiddenRedeem(address caller);
    error OperatorNFTForbiddenSetOperator(address caller);
    error OperatorNFTForbiddenRedeemWithOperator(address operator);

    using EnumerableSet for EnumerableSet.AddressSet;
    uint256 private _tokenIdCounter;
    mapping(uint256 => IOperator) private _operators;
    mapping(uint256 => uint256) private _authorizerTokenIds;
    EnumerableSet.AddressSet private _verifiedOperatorsSet;

    constructor(
        string memory _name,
        string memory _symbol,
        address receiver,
        uint96 feeNumerator,
        address manager
    ) ERC721(_name, _symbol) AccessManaged(manager) {
        _tokenIdCounter = 1;
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function safeMint(
        uint256 authorizerTokenId,
        address to
    ) external restricted {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _safeMint(to, tokenId);
        _register(tokenId, authorizerTokenId);
    }

    function operatorRedeem(
        uint256 operatorTokenId,
        IOperator.Redemption calldata redemption
    ) external restricted {
        IOperator operator = _operators[operatorTokenId];
        if (address(operator) == address(0)) {
            redemption.token.redeem(
                redemption.redemptionId,
                redemption.tokenId,
                redemption.memo
            );
            return;
        } else if (_verifiedOperatorsSet.contains(address(operator))) {
            operator.safeRedeem(redemption);
        } else {
            IOperator.Redemption memory _redemption = redemption;
            _redemption.memo = string(
                abi.encodePacked("[WARNING] ", redemption.memo)
            );
            operator.redeem(_redemption);
        }
        if (
            redemption.token.isRedeemed(
                address(operator),
                redemption.redemptionId,
                redemption.tokenId
            ) == false
        ) {
            revert OperatorNFTForbiddenRedeemWithOperator(address(operator));
        }
    }

    function set(uint256 operatorTokenId, address operator) external {
        if (
            _isAuthorized(
                ownerOf(operatorTokenId),
                _msgSender(),
                operatorTokenId
            ) == false
        ) {
            revert OperatorNFTForbiddenRedeem(_msgSender());
        }
        _operators[operatorTokenId] = IOperator(operator);
        this.redeem(
            _randomRedemptionId(),
            operatorTokenId,
            "OperatorNFT: set operator"
        );
    }

    function register(
        uint256 operatorTokenId,
        uint256 authorizerTokenId
    ) external {
        if (
            _isAuthorized(
                ownerOf(operatorTokenId),
                _msgSender(),
                operatorTokenId
            ) == false
        ) {
            revert OperatorNFTForbiddenSetOperator(_msgSender());
        }
        _register(operatorTokenId, authorizerTokenId);
    }

    function verifyOperator(
        IOperator operator,
        bool isVerified
    ) external restricted {
        if (isVerified) {
            _verifiedOperatorsSet.add(address(operator));
        } else {
            _verifiedOperatorsSet.remove(address(operator));
        }
    }

    function getOperatorAddress(
        uint256 operatorTokenId
    ) external view returns (address) {
        return address(_operators[operatorTokenId]);
    }

    function getAuthorizerTokenId(
        uint256 operatorTokenId
    ) external view returns (uint256) {
        return _authorizerTokenIds[operatorTokenId];
    }

    function _register(
        uint256 operatorTokenId,
        uint256 authorizerTokenId
    ) internal {
        _authorizerTokenIds[operatorTokenId] = authorizerTokenId;
        this.redeem(
            _randomRedemptionId(),
            operatorTokenId,
            "OperatorNFT: register authorizer token"
        );
    }

    function _randomRedemptionId() internal view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(block.prevrandao, block.timestamp, msg.sender)
            );
    }

    function _increaseBalance(
        address account,
        uint128 amount
    ) internal virtual override(ERC6672, ERC721) {
        ERC6672._increaseBalance(account, amount);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override(ERC6672, ERC721) returns (address) {
        return ERC6672._update(to, tokenId, auth);
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
