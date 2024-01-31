const { task, types } = require('hardhat/config');

task('mint', 'Mint NFTs')
    .addParam('signer', 'Signer address', undefined, types.string)
    .addParam('contract', 'Contract address', undefined, types.string)
    .addParam('recipient', 'Recipient address', undefined, types.string)
    .setAction(async (taskArgs, hre) => {
        const gasPrice = (await hre.ethers.provider.getFeeData()).maxFeePerGas;
        const signer = await hre.ethers.getSigner(taskArgs.signer);
        const contract = await hre.ethers.getContractAt('TestNFT', taskArgs.contract);
        await contract.connect(signer).safeMint(taskArgs.recipient, { gasPrice });
        console.log(`${await contract.name()} minted to: ${taskArgs.recipient}`);
    });
