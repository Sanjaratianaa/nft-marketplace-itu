const CONTRACT_ADDRESS = "0xf2a1cC8C6F235f22ec4e1CE45f592ee28c7a5242";
const ABI = [
    // fonctions principales
    "function mintNFT(address to, string memory tokenURI) external returns (uint256)",
    "function listNFT(uint256 tokenId, uint256 price) external",
    "function buyNFT(uint256 tokenId) external payable",
    "function cancelListing(uint256 tokenId) external",

    // fonctions de lecture
    "function getListing(uint256 tokenId) external view returns (uint256 price, address seller, bool active)",
    "function totalSupply() external view returns (uint256)",
    "function ownerOf(uint256 tokenId) external view returns (address)",
    "function tokenURI(uint256 tokenId) external view returns (string)",

    // Events
    "event NFTMinted(address indexed to, uint256 tokenId, string tokenURI)",
    "event NFTListed(uint256 indexed tokenId, uint256 price, address seller)",
    "event NFTSold(uint256 indexed tokenId, address buyer, uint256 price)",
    "event ListingCancelled(uint256 indexed tokenId)"
];

let provider;
let signer;
let contract;

async function connecterMetaMask() {
    if (typeof window.ethereum === "undefined") {
        afficherMessage(" MetaMask non détecté. Installe l'extension MetaMask.", "erreur");
        return;
    }

    try {
        provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = await provider.getSigner();

        const adresse = await signer.getAddress();
        const reseau = await provider.getNetwork();
        if (reseau.chainId !== 11155111n) {
            afficherMessage(" Mauvais réseau ! Passe sur Sepolia dans MetaMask.", "erreur");
            return;
        }

        contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
        const btnConnexion = document.getElementById("btn-connexion");
        if (btnConnexion) {
            btnConnexion.textContent = ` ${adresse.slice(0, 6)}...${adresse.slice(-4)}`;
            btnConnexion.disabled = true;
        }

        afficherMessage(` Connecté : ${adresse}`, "succes");

        await afficherNFTs();

    } catch (err) {
        console.error("Erreur connexion MetaMask :", err);
        afficherMessage(" Connexion annulée ou échouée.", "erreur");
    }
}

async function mintNFT() {
    if (!contract) {
        afficherMessage(" Connecte d'abord MetaMask.", "erreur");
        return;
    }

    // Lecture et validation HTML5 native des inputs
    const elAdresse = document.getElementById("mint-adresse");
    const elTokenURI = document.getElementById("mint-tokenuri");

    if (elAdresse && !elAdresse.reportValidity()) return;
    if (elTokenURI && !elTokenURI.reportValidity()) return;

    const destinataire = elAdresse.value.trim();
    const tokenURI     = elTokenURI.value.trim();

    if (!ethers.isAddress(destinataire)) {
        afficherMessage(" Adresse Ethereum invalide.", "erreur");
        return;
    }

    try {
        afficherMessage(" Mint en cours… Confirme dans MetaMask.", "info");

        const tx = await contract.mintNFT(destinataire, tokenURI);
        afficherMessage(` Transaction envoyée : ${tx.hash}`, "info");

        const receipt = await tx.wait();
        afficherMessage(` NFT minté ! Bloc : ${receipt.blockNumber} — TxHash : ${tx.hash}`, "succes");

        await afficherNFTs();

        // Effacer les champs du formulaire après succès
        if (elAdresse) elAdresse.value = "";
        if (elTokenURI) elTokenURI.value = "";

    } catch (err) {
        console.error("Erreur mintNFT :", err);
        afficherMessage(` Mint échoué : ${err.reason || err.message}`, "erreur");
    }
}

async function listerNFT() {
    if (!contract) {
        afficherMessage(" Connecte d'abord MetaMask.", "erreur");
        return;
    }

    // Lecture et validation HTML5 native des inputs
    const elTokenId = document.getElementById("list-tokenid");
    const elPrix = document.getElementById("list-prix");

    if (elTokenId && !elTokenId.reportValidity()) return;
    if (elPrix && !elPrix.reportValidity()) return;

    const tokenId   = elTokenId.value.trim();
    const prixEther = elPrix.value.trim();

    try {
        const prixWei = ethers.parseEther(prixEther);

        afficherMessage(" Mise en vente en cours… Confirme dans MetaMask.", "info");

        const tx = await contract.listNFT(BigInt(tokenId), prixWei);
        afficherMessage(` Transaction envoyée : ${tx.hash}`, "info");

        const receipt = await tx.wait();
        afficherMessage(
            ` NFT #${tokenId} mis en vente à ${prixEther} ETH ! Bloc : ${receipt.blockNumber}`,
            "succes"
        );

        await afficherNFTs();

        // Effacer les champs du formulaire après succès
        if (elTokenId) elTokenId.value = "";
        if (elPrix) elPrix.value = "";

    } catch (err) {
        console.error("Erreur listNFT :", err);
        afficherMessage(` Mise en vente échouée : ${err.reason || err.message}`, "erreur");
    }
}

async function acheterNFT(tokenId, prixWei) {
    if (!contract) {
        afficherMessage(" Connecte d'abord MetaMask.", "erreur");
        return;
    }

    try {
        const prixEther = ethers.formatEther(prixWei);
        afficherMessage(
            ` Achat NFT #${tokenId} pour ${prixEther} ETH… Confirme dans MetaMask.`,
            "info"
        );

        const tx = await contract.buyNFT(BigInt(tokenId), { value: prixWei });
        afficherMessage(` Transaction envoyée : ${tx.hash}`, "info");

        const receipt = await tx.wait();
        afficherMessage(
            ` NFT #${tokenId} acheté ! TxHash : ${tx.hash} — Bloc : ${receipt.blockNumber}`,
            "succes"
        );

        await afficherNFTs();

    } catch (err) {
        console.error("Erreur buyNFT :", err);
        afficherMessage(` Achat échoué : ${err.reason || err.message}`, "erreur");
    }
}

async function afficherNFTs() {
    const galerie = document.getElementById("galerie-nfts");
    if (!galerie) return;

    if (!contract) {
        galerie.innerHTML = "<p>Connecte MetaMask pour voir les NFTs en vente.</p>";
        return;
    }

    try {
        galerie.innerHTML = "<p> Chargement des NFTs en vente…</p>";

        const total = await contract.totalSupply();
        const nftsEnVente = [];

        for (let i = 0; i < Number(total); i++) {
            const [price, seller, active] = await contract.getListing(i);

            if (active) {
                const uri = await contract.tokenURI(i);
                nftsEnVente.push({ tokenId: i, price, seller, tokenURI: uri });
            }
        }

        if (nftsEnVente.length === 0) {
            galerie.innerHTML = "<p>Aucun NFT en vente pour l'instant.</p>";
            return;
        }

        galerie.innerHTML = "";

        for (const nft of nftsEnVente) {
            const prixEther = ethers.formatEther(nft.price);

            const card = document.createElement("div");
            card.className = "nft-card";
            card.innerHTML = `
        <h3>NFT #${nft.tokenId}</h3>
        <p><strong>Vendeur :</strong> ${nft.seller.slice(0, 6)}...${nft.seller.slice(-4)}</p>
        <p><strong>Prix :</strong> ${prixEther} ETH</p>
        <p><strong>URI :</strong>
          <a href="${nft.tokenURI}" target="_blank" rel="noopener">Voir métadonnées</a>
        </p>
        <button onclick="acheterNFT(${nft.tokenId}, ${nft.price}n)">
          🛒 Acheter pour ${prixEther} ETH
        </button>
      `;

            galerie.appendChild(card);
        }

    } catch (err) {
        console.error("Erreur afficherNFTs :", err);
        galerie.innerHTML = `<p> Impossible de charger les NFTs : ${err.message}</p>`;
    }
}

function afficherMessage(texte, type = "info") {
    const el = document.getElementById("status-message");
    if (!el) {
        console.log(`[${type.toUpperCase()}] ${texte}`);
        return;
    }
    el.textContent = texte;
    el.className = `message-${type}`;
    if (type === "succes") {
        setTimeout(() => { el.textContent = ""; }, 8000);
    }
}

window.addEventListener("DOMContentLoaded", () => {

    document.getElementById("btn-connexion")
        ?.addEventListener("click", connecterMetaMask);

    document.getElementById("btn-mint")
        ?.addEventListener("click", mintNFT);

    document.getElementById("btn-lister")
        ?.addEventListener("click", listerNFT);

    if (window.ethereum) {
        window.ethereum.on("accountsChanged", () => location.reload());
        window.ethereum.on("chainChanged",    () => location.reload());

        // Auto-connexion si le site est déjà autorisé dans MetaMask
        window.ethereum.request({ method: "eth_accounts" })
            .then(accounts => {
                if (accounts.length > 0) {
                    connecterMetaMask();
                }
            })
            .catch(err => console.error("Erreur auto-connexion :", err));
    }
});