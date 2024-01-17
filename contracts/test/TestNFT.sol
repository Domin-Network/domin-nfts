// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@domin-network/contracts/token/ERC6672.sol";

contract TestNFT is ERC6672, ERC721Burnable, Ownable {
    uint256 _tokenIdCounter;

    constructor() ERC721("TestNFT", "TNFT") Ownable(_msgSender()) {
        _tokenIdCounter = 1;
    }

    function safeMint(address to) public onlyOwner {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _safeMint(to, tokenId);
    }

    function safeBatchMint(address to, uint256 count) public onlyOwner {
        for (uint256 i = 1; i <= count; i++) {
            safeMint(to);
        }
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
        return ERC721Enumerable._update(to, tokenId, auth);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC6672, ERC721) returns (bool) {
        return
            interfaceId == type(ERC6672).interfaceId ||
            ERC721Enumerable.supportsInterface(interfaceId);
    }
}
