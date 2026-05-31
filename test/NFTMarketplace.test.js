import { expect } from "chai";
import hre from "hardhat";

describe("Tests du contrat NFTMarketplace", function () {
  let marketplace;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await hre.ethers.getSigners();
    const NFTMarketplace = await hre.ethers.getContractFactory("NFTMarketplace");
    marketplace = await NFTMarketplace.deploy();
  });

  it("1. Devrait minter un nouveau NFT correctement", async function () {
    const tokenURI = "https://ipfs.io/ipfs/QmMachinTruc...";
    
    await expect(marketplace.mintNFT(user1.address, tokenURI))
      .to.emit(marketplace, "NFTMinted")
      .withArgs(user1.address, 0, tokenURI);

    expect(await marketplace.ownerOf(0)).to.equal(user1.address);
    expect(await marketplace.tokenURI(0)).to.equal(tokenURI);
  });

  it("2. Devrait permettre de lister (vendre) et d'acheter un NFT", async function () {
    const prix = hre.ethers.parseEther("0.1");
    const tokenURI = "https://example.com/nft";

    await marketplace.mintNFT(user1.address, tokenURI);

    await expect(marketplace.connect(user1).listNFT(0, prix))
      .to.emit(marketplace, "NFTListed")
      .withArgs(0, prix, user1.address);

    const listing = await marketplace.getListing(0);
    expect(listing.active).to.be.true;
    expect(listing.price).to.equal(prix);

    await expect(marketplace.connect(user2).buyNFT(0, { value: prix }))
      .to.emit(marketplace, "NFTSold")
      .withArgs(0, user2.address, prix);

    expect(await marketplace.ownerOf(0)).to.equal(user2.address);
  });

  it("3. Devrait empecher de lister un NFT que l'on ne possede pas", async function () {
    const prix = hre.ethers.parseEther("1.0");
    await marketplace.mintNFT(user1.address, "url");

    await expect(marketplace.connect(user2).listNFT(0, prix))
      .to.be.revertedWith("Vous n'etes pas le proprietaire");
  });
});
