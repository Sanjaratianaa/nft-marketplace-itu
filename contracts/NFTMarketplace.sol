// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is ERC721URIStorage, Ownable {

    // Compteur pour les IDs des NFTs
    uint256 private _tokenIdCounter;

    // Structure d'une vente
    struct Listing {
        uint256 price;
        address seller;
        bool active;
    }

    // mapping tokenId → Listing
    mapping(uint256 => Listing) public listings;

    // Events
    event NFTMinted(address indexed to, uint256 tokenId, string tokenURI);
    event NFTListed(uint256 indexed tokenId, uint256 price, address seller);
    event NFTSold(uint256 indexed tokenId, address buyer, uint256 price);
    event ListingCancelled(uint256 indexed tokenId);

    constructor() ERC721("ITU NFT", "ITUD") Ownable(msg.sender) {}

    // Mint un nouveau NFT
    function mintNFT(address to, string memory tokenURI) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        emit NFTMinted(to, tokenId, tokenURI);
        return tokenId;
    }

    // Mettre en vente un NFT
    function listNFT(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Vous n'etes pas le proprietaire");
        require(price > 0, "Prix doit etre superieur a 0");
        approve(address(this), tokenId);

        listings[tokenId] = Listing(price, msg.sender, true);
        emit NFTListed(tokenId, price, msg.sender);
    }

    // Acheter un NFT
    function buyNFT(uint256 tokenId) external payable {
        Listing memory listing = listings[tokenId];
        require(listing.active, "NFT non en vente");
        require(msg.value >= listing.price, "Prix insuffisant");

        listings[tokenId].active = false;
        _transfer(listing.seller, msg.sender, tokenId);

        // Payer le vendeur
        (bool success, ) = payable(listing.seller).call{value: msg.value}("");
        require(success, "Paiement echoue");

        emit NFTSold(tokenId, msg.sender, msg.value);
    }

    // Annuler une vente
    function cancelListing(uint256 tokenId) external {
        require(listings[tokenId].seller == msg.sender, "Non autorise");
        require(listings[tokenId].active, "Pas en vente");
        listings[tokenId].active = false;
        emit ListingCancelled(tokenId);
    }

    // Voir tous les détails d'un listing
    function getListing(uint256 tokenId) external view returns (uint256 price, address seller, bool active) {
        Listing memory l = listings[tokenId];
        return (l.price, l.seller, l.active);
    }

    // Nombre total de NFTs mintés
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
}