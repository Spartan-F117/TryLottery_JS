import {useState, useEffect, React} from 'react'
import Head from 'next/head'
import 'bulma/css/bulma.css'
import styles from '../styles/try_lottery.module.css'
import TryLotteryContract from  '../blockchain/try_lottery_deploy'
import Web3 from 'web3'


const try_lottery_manager = () => {

    // Attributes ---------------------------------------------------------------------------------------------------
    const [error, setError] = useState('')                                                  // error messages
    const [SuccessMsg, setSuccessMsg]  = useState('')                                       // success messages
    const [EventLogger, setEventLogger] = useState('')                                      // event messages
    const [EventRetrived, setEventRetrived] = useState(false)                               // true if the past events are already retrived, else false

    const [lotteryOwner, SetlotteryOwner] = useState('Not Connected')                       // Lottery Owner
    const [LotteryStatus, setLotteryStatus] = useState('Not Connected')                     // Lottery Status
    
    const [TicketNumbers, setTicketNumbers] = useState('')                                  // Ticket numbers retrived from input text field
    const [TicketPowerball, setTicketPowerball] = useState('')                              // Ticket powerball retrived from input text field
    const [CurrentAddress, setCurrentAddress] = useState('')                                // current player
    const [players,setPlayers] = useState([])                                               // list of all players in the actual round
    const [HistoryLottery, setHistoryLottery] = useState([])                                // list of the number extracted in all the rounds

    const [web3, setWeb3] = useState(null)                                                  // contains information about wallet
    const [localContract, setLocalContract] = useState(null)                                // local instance of smart contract
    
    
    // Methods ---------------------------------------------------------------------------------------------------


    /* Retrive all past event for the event "RandomNumbersExtracted" */
    function PastEventExtraction() {
        let options = {
            fromBlock: 0,
            toBlock: 'latest'}
        
        // retrive the HistoryLottery list
        const newList = HistoryLottery                                                      
        try{
            localContract.getPastEvents("RandomNumbersExtracted",options).then(results => {

                for (let i=0; i < results.length; i++){
                    const json_result =  results[i]["returnValues"]
                    newList = newList.concat(`Number Extracted: ${json_result[0]}, ${json_result[1]}, ${json_result[2]}, ${json_result[3]}, ${json_result[4]}. Powerball is: ${json_result[5]} `)
                }
    
                setHistoryLottery(newList)
                setEventRetrived(true)
            })
        }catch(err){
            console.log(err)
        }
    }


    /* Event Listner */
    function checkEvents() {
        setEventRetrived(false)
        console.log("listening for some events")
        try{
            localContract.events.allEvents().on("data", (event) => {        
            
                // every event detected update the lottery status
                getLotteryStatusHandler()
                
                // if the event is "TicketEmitted" or "NewRoundStarted" update the Players Card
                if (event["event"] == "TicketEmitted" || event["event"] == "NewRoundStarted")   getEnrolledLotteryUsers()
                
                if (event["event"] == "RandomNumbersExtracted"){
                    const newllist = HistoryLottery.concat(`Number Extracted: ${event["returnValues"][0]}, ${event["returnValues"][1]}, ${event["returnValues"][2]}, ${event["returnValues"][3]}, ${event["returnValues"][4]}. Powerball is: ${event["returnValues"][5]} `)
                    setHistoryLottery(newllist)
                }
                
                // update the EventLogger variable
                setEventLogger(event["event"])
            })
        }catch(err){
            console.log(err)
        }
    }


    /* At the start "localContract" will change */
    useEffect(() => {
        if(localContract) {
            PastEventExtraction()
            getLotteryOwnerHandler()                  // update lottery owner variable
            getLotteryStatusHandler()                 // update lottery status variable
            getEnrolledLotteryUsers()                 // update lottery enrolled to newsletter variable
        }
    }, [localContract])


    /* After get the past event, this will be called, will execute checkEvents just 1 time, cause of EventRetrived set to false */
    useEffect(() => {
        if(EventRetrived) {
            checkEvents()
        }
    }, [EventRetrived, HistoryLottery])


    /* delete an error/success message, after that a success/error message is shown  */
    useEffect(() => {
        setSuccessMsg('')
    }, [error])


    useEffect(() => {
        setError('')
    }, [SuccessMsg])


    /* set the Ticket Numbers */
    const updateTicketNumbers = event => {
        setTicketNumbers(event.target.value)
    }


    /* set the Ticket Powerball */
    const updateTicketPowerball = event => {
        setTicketPowerball(event.target.value)
    }


    /* get the Lottery Owner and set the lotteryOwner variable */
    const getLotteryOwnerHandler = async () => {
        try{
            const addressOwner = await localContract.methods.lottery_owner().call()
            SetlotteryOwner(addressOwner)
        }catch(err){
            localContract.methods.lottery_owner()
            .call({'from': CurrentAddress}).then(() => {
            throw Error ('reverted tx')})
            .catch(revertReason => {
                var suberror = revertReason.toString().split('"message": "')[1]
                setError(suberror)
            })
        }

    }


    /* get the lottery players */
    const getEnrolledLotteryUsers = async () => {
        try{
            const players_array = await localContract.methods.getEnrolledusers().call()
            players_array = players_array.filter(v => v !== '0x0000000000000000000000000000000000000000'); 
            setPlayers(players_array)
        }catch(err){
            localContract.methods.getEnrolledusers()
            .call({'from': CurrentAddress}).then(() => {
            throw Error ('reverted tx')})
            .catch(revertReason => {
                var suberror = revertReason.toString().split('"message": "')[1]
                setError(suberror)
            })
        }
    }


    /* get the lottery status */
    const getLotteryStatusHandler = async () => {
        try{
            const status = await localContract.methods.LotteryStatus().call()
            setLotteryStatus(status)
        }catch(err){
            localContract.methods.LotteryStatus()
            .call({'from': CurrentAddress}).then(() => {
            throw Error ('reverted tx')})
            .catch(revertReason => {
                var suberror = revertReason.toString().split('"message": "')[1]
                setError(suberror)
            })
        }

    }


    /* Create Lottery Button Handler */
    const CreateLotteryHandler = async () => {
        try{
            await localContract.methods.createLottery().send({from: CurrentAddress})
            setSuccessMsg("Lottery Created Successfully!")
        }catch(err){
            localContract.methods.createLottery()
            .call({'from': CurrentAddress}).then(() => {
            throw Error ('reverted tx')})
            .catch(revertReason => {
                var suberror = revertReason.toString().split('"message": "')[1]
                setError(suberror)
            })
        }
    }


    /* Buy Ticket - TRY smart contract */
    const BuyTicketsHandler = async () =>{
        try{
            const arraynumbers = TicketNumbers.split(",")
            if(arraynumbers.length != 5){
                setError("You should use 5 number in the input text, comma separated")
                return
            }

            //send transaction
            await localContract.methods.buy(arraynumbers[0],arraynumbers[1],arraynumbers[2],arraynumbers[3],arraynumbers[4],TicketPowerball).send({
                    from: CurrentAddress,
                    value: 1000000000
                })
            setSuccessMsg("ticket purchased!")

        }catch(err){
            if (err.code === 4001){
                setError("Rejected Transaction by the User")
                return
            }

            const arraynumbers = TicketNumbers.split(",")
            localContract.methods.buy(arraynumbers[0],arraynumbers[1],arraynumbers[2],arraynumbers[3],arraynumbers[4],TicketPowerball)
            .call({'from': CurrentAddress,'value': 1000000000}).then(() => {
            throw Error ('reverted tx')})
            .catch(revertReason => {
                var suberror = revertReason.toString().split('"message": "')[1].split(',')[0]
                setError(suberror)
            })
        }
    }


    /* Start New Round - TRY smart contract */
    const StartNewRoundHandler = async () =>{
        try{
            await localContract.methods.StartNewRound().send({from: CurrentAddress})
            setSuccessMsg("New Round Started!")
        }catch(err){
            if (err.code === 4001){
                setError("Rejected Transaction by the User")
                return
            } 
            localContract.methods.StartNewRound()
                .call({'from': CurrentAddress}).then(() => {
                throw Error ('reverted tx')})
                .catch(revertReason => {
                    var suberror = revertReason.toString().split('"message": "')[1].split(',')[0]
                    setError(suberror)
                    setSuccessMsg('')
                })
        }
    }


    /* Draw Numbers - TRY smart contract */
    const DrawNumbersHandler = async () =>{
        try{
            var transactionLog = await localContract.methods.drawNumbers().send({from: CurrentAddress})
            
            var extr_numb1 = transactionLog.events.RandomNumbersExtracted.returnValues[0]
            var extr_numb2 = transactionLog.events.RandomNumbersExtracted.returnValues[1]
            var extr_numb3 = transactionLog.events.RandomNumbersExtracted.returnValues[2]
            var extr_numb4 = transactionLog.events.RandomNumbersExtracted.returnValues[3]
            var extr_numb5 = transactionLog.events.RandomNumbersExtracted.returnValues[4]
            var extr_powerball = transactionLog.events.RandomNumbersExtracted.returnValues[5]

            setSuccessMsg(`Number Extracted: ${extr_numb1}, ${extr_numb2}, ${extr_numb3}, ${extr_numb4}, ${extr_numb5}. Powerball is: ${extr_powerball} `)

        }catch(err){
            if (err.code === 4001){
                setError("Rejected Transaction by the User")
                return
            } 
            localContract.methods.drawNumbers()
                .call({'from': CurrentAddress}).then(() => {
                throw Error ('reverted tx')})
                .catch(revertReason => {
                    var suberror = revertReason.toString().split('"message": "')[1].split(',')[0]
                    setError(suberror)
                })
        }
    }


    /* Give Prizes - TRY smart contract */
    const GivePrizesHandler = async () =>{
        try{
            await localContract.methods.givePrizes().send({from: CurrentAddress})
            setSuccessMsg("Prizes Assigned to the winners!")
        }catch(err){
            if (err.code === 4001){
                setError("Rejected Transaction by the User")
                return
            } 
            localContract.methods.givePrizes().call({'from': CurrentAddress}).then(() => {
                throw Error ('reverted tx')
            }).catch(revertReason => {
                    var suberror = revertReason.toString().split('"message": "')[1].split(',')[0]
                    setError(suberror)
                })
        }
    }


    /* Close Lottery - TRY smart contract */
    const CloseLotteryHandler = async () =>{
        try{
            await localContract.methods.close_lottery().send({from: CurrentAddress})
            setSuccessMsg("Lottery Closed!")
        }catch(err){
            if (err.code === 4001){
                setError("Rejected Transaction by the User")
                return
            } 
            localContract.methods.close_lottery()
                .call({'from': CurrentAddress}).then(() => {
                throw Error ('reverted tx')})
                .catch(revertReason => {
                    var suberror = revertReason.toString().split('"message": "')[1].split(',')[0]
                    setError(suberror)
                })
        }
    }


    const connectWalletHandler = async () => {
        /* Check if MetaMask is available */
        if (typeof window !== "undefine" && typeof window.ethereum !== "undefined"){
            try{
                /* request wallet connect */
                await window.ethereum.request({ method: 'eth_requestAccounts'})
                
                /* set web3 instance  */
                web3 = new Web3(window.ethereum)
                
                /* Set web3 instance in react state */
                setWeb3(web3)
                
                /* get list of account */
                const accounts = await web3.eth.getAccounts()
                setCurrentAddress(accounts[0])

                /* create local contract copy */
                const contract_try = TryLotteryContract(web3)
                setLocalContract(contract_try)

            }catch(err){
                setError(err.message)
            }
        }else{
            // metamask no installed
            console.log("Please install metamask")
        }
    }



    // HTML -------------------------------------------------------------------------------------------------
    return (
        <div className={styles.main}>
            <Head>
                <title>Try Lottery Dapp</title>
                <meta name="description" content="TRY Smart Contract" />
            </Head>

            < nav className="navbar mt-4 mb-4">
                <div className="container">
                    <div className="navbar-brand">
                        <h1>TRY: a nfT lotteRY</h1>
                    </div>
                    <div className="navbar-end">         
                        <button onClick={connectWalletHandler} className="button is-primary">Connect Wallet</button>
                    </div>

                </div>
            </nav>

            <section>
                <div className='container'>
                    <p align="center">lottery manager: {lotteryOwner}</p>
                </div>
            </section>
            <section>
                <div className='container'>
                    <p align="center">Lottery Status: {LotteryStatus}</p>
                </div>
            </section>

            <section>
                <div className='columns'>
                    <div className='column is-one-fifth'>
                        <p><b>Users UI</b></p>
                        <section className="mt-5">
                            <div className='container'>
                                <div className="field">
                                    <label className="label">Buy Ticket: 1Gwei</label>
                                    <div className='control'>
                                        <input onChange={updateTicketNumbers} className="input" type="text" placeholder="Enter 5 numbers (comma separated)" />
                                        <input onChange={updateTicketPowerball} className="input" type="text" placeholder="Enter powerball" />
                                    </div>
                                    <button onClick={BuyTicketsHandler} className="button is-primary mt-1 mb-5">Buy Ticket</button>
                                </div>   
                            </div>
                        </section>


                        <section className="mt-5">
                            <h1>Lottery Manager Only:</h1>
                            
                            <p align="center">
                                <button onClick={CreateLotteryHandler} className='button is-danger mt-3 mr-5'>Create Lottery</button>
                            </p>

                            <button onClick={StartNewRoundHandler} className='button is-link mt-3 mr-5'>Start New Round</button>
                            <button onClick={DrawNumbersHandler} className='button is-link mt-3'>Draw Numbers</button>
                            <br></br>
                            <button onClick={GivePrizesHandler} className='button is-link mt-3 mr-6'>Give Prizes</button>
                            <button onClick={CloseLotteryHandler} className='button is-link mt-3 ml-4'>Close Lottery</button>
                        </section>
                    </div>

                    <div className='column'></div>
                    
                    <div className='column is-one-third' align="right">
                        <section className="mt-5">
                            <div className='card'>
                                <div className='card-content'>
                                    <div className='content'>
                                        <h2>Lottery Numbers History</h2>
                                        <div className='history-entry'>
                                            <div>
                                            <ul>
                                                {
                                                    (HistoryLottery && HistoryLottery.length > 0) && HistoryLottery.map((history,index) => {
                                                        return <li key={`${history}-${index}`}>{history}</li>
                                                    })
                                                }
                                            </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>    
                    </div>

                    <div className='column is-one-third' align="right">
                        <section className="mt-5">
                            <div className='card'>
                                <div className='card-content'>
                                    <div className='content'>
                                        <h2>Tickets sold to</h2>
                                        <ul>
                                            {
                                                (players && players.length > 0) && players.map((player,index) => {
                                                    return <li key={`${player}-${index}`}>{player}</li>
                                                })
                                            }
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>    
                    </div>

                </div>
            </section>


            <section>
                <div className='container has-text-danger mt-8'>
                    <p align="center">Errors: {error}</p>
                </div>
            </section>

            <section>
                <div className='container has-text-success mt-8'>
                    <p align="center">Success Messages: {SuccessMsg}</p>
                </div>
            </section>

            <section>
                <div className='container has-text-success mt-8'>
                    <p align="center">Last Hook Event: {EventLogger}</p>
                </div>
            </section>

            <footer className={styles.footer}>
                <p align="center">Filippo Dolente - TRY Dapp 2022</p>
            </footer>
        </div>
    )
}


export default try_lottery_manager