How start running the project:

	- from TryLottery_JS
		run start_script.sh
			- this script will compile the smart contract and will generate the TryLottery.json 
			that will contains the bytecode and the ABI
			- also this script will run the ganache blockchain with the "mnemonic option", with the
			same accounts
	- from try_app
		run "truffle migrate"
	- from try_frontend
		run "npm run dev"
		
Now the enviroment is up! You can reach the frontend at localhost:3000
