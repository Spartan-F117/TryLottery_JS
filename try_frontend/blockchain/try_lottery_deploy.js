import Web3 from 'web3'
const provider = new Web3.providers.HttpProvider("http://localhost:8545")
const web3 = new Web3(provider)

var mydata = require("../../env.json");
const { abi } = require("../../try_app/build/contracts/TryLottery.json")
const contractAddress = mydata.contractAddress



// take "web3" as argument
const TryLotteryContract = web3 =>{
    return new web3.eth.Contract(abi, contractAddress) 
}


export default TryLotteryContract
