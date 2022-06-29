const Migrations = artifacts.require("Migrations");
const TryLottery = artifacts.require("TryLottery");

module.exports = function (deployer) {
  var mydata = require("../../env.json");
  deployer.deploy(Migrations);
  deployer.deploy(TryLottery,mydata.DurationBlock,mydata.RandomNumber);
};
