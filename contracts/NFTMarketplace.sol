// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title NFT Marketplace
/// @author Groupe 5 — IT University Madagascar 2025/2026
/// @notice Contrat permettant de minter, lister et acheter des NFTs ERC-721
/// @dev Utilise OpenZeppelin ERC721URIStorage et Ownable
contract NFTMarketplace is ERC721URIStorage, Ownable {

    uint256 private _tokenIdCounter;

    struct Listing {
        uint256 price;
        address seller;
        bool active;
    }

    mapping(uint256 => Listing) public listings;

    event NFTMinted(address indexed to, uint256 tokenId, string tokenURI);
    event NFTListed(uint256 indexed tokenId, uint256 price, address seller);
    event NFTSold(uint256 indexed tokenId, address buyer, uint256 price);
    event ListingCancelled(uint256 indexed tokenId);

    constructor() ERC721("ITU NFT", "ITUD") Ownable(msg.sender) {}

    /// @notice Crée un nouveau NFT et l'envoie à une adresse
    /// @param to L'adresse qui recevra le NFT
    /// @param tokenURI Le lien vers les métadonnées du NFT (IPFS)
    /// @return tokenId L'identifiant unique du NFT créé
    function mintNFT(address to, string memory tokenURI) external returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        emit NFTMinted(to, tokenId, tokenURI);
        return tokenId;
    }

    /// @notice Met un NFT en vente à un prix défini en wei
    /// @param tokenId L'identifiant du NFT à vendre
    /// @param price Le prix de vente en wei
    function listNFT(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Vous n'etes pas le proprietaire");
        require(price > 0, "Prix doit etre superieur a 0");
        approve(address(this), tokenId);
        listings[tokenId] = Listing(price, msg.sender, true);
        emit NFTListed(tokenId, price, msg.sender);
    }

    /// @notice Achete un NFT en vente en envoyant les ETH requis
    /// @param tokenId L'identifiant du NFT a acheter
    function buyNFT(uint256 tokenId) external payable {
        Listing memory listing = listings[tokenId];
        require(listing.active, "NFT non en vente");
        require(msg.value >= listing.price, "Prix insuffisant");
        listings[tokenId].active = false;
        _transfer(listing.seller, msg.sender, tokenId);
        (bool success, ) = payable(listing.seller).call{value: msg.value}("");
        require(success, "Paiement echoue");
        emit NFTSold(tokenId, msg.sender, msg.value);
    }

    /// @notice Annule la vente d'un NFT
    /// @param tokenId L'identifiant du NFT dont la vente est annulee
    function cancelListing(uint256 tokenId) external {
        require(listings[tokenId].seller == msg.sender, "Non autorise");
        require(listings[tokenId].active, "Pas en vente");
        listings[tokenId].active = false;
        emit ListingCancelled(tokenId);
    }

    /// @notice Retourne les details d'une vente
    /// @param tokenId L'identifiant du NFT
    /// @return price Le prix en wei
    /// @return seller L'adresse du vendeur
    /// @return active Si la vente est active ou non
    function getListing(uint256 tokenId) external view returns (uint256 price, address seller, bool active) {
        Listing memory l = listings[tokenId];
        return (l.price, l.seller, l.active);
    }

    /// @notice Retourne le nombre total de NFTs mintes
    /// @return Le nombre total de NFTs
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
}