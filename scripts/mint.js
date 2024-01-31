const hre = require('hardhat');
const dotenv = require('dotenv');
dotenv.config();

async function main() {
    const authorizerNFTHolder = (await hre.ethers.getSigners())[1];
    const operatorNFTHolder = (await hre.ethers.getSigners())[2];
    const authorizerNFT = await hre.ethers.getContractAt('AuthorizerNFT', process.env.AUTHORIZER_NFT_CONTRACT_ADDRESS);
    await authorizerNFT.safeMint(authorizerNFTHolder.address);
    console.log(`AuthorizerNFT minted to: ${authorizerNFTHolder.address}`);
    await authorizerNFT.connect(authorizerNFTHolder).safeMintOperatorNFT(1, operatorNFTHolder.address);
    console.log(`OperatorNFT minted to: ${operatorNFTHolder.address}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
