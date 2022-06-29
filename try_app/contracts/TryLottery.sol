// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract TryLottery is ERC721URIStorage {
    
    // EVENTS **********************************************************************************************************************************************
    event TicketEmitted(address);                                                   // event issued when a ticket is sold
    event RoundClosed(uint);                                                        // event issued when a round is closed
    event LotteryClosed();                                                          // event issued when the lottery is closed
    event WrongPriceTicket(address);                                                // event issued when trying to buy a ticket at a price other than 1gwei
    event Refund(uint256);                                                          // event issued when a refund is made to all lottery participants
    event PrizePaid(string);                                                        // event issued when prizes are distributed to lottery winners
    event LotteryCreated(string);                                                   // the lottery has been deployed on blockchain
    event RandomNumbersExtracted(uint256,uint256,uint256,uint256,uint256,uint256);  // event issued at the end of the DrawNumbers
    event NewRoundStarted(string);                                                  // event issued when a new round is start

    // delcaring a counter for the tokenID (NFTs)
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    string text_token;                                                              // text written in metadata of the token

    // ticket structure
    struct ticket{
        uint [5] number;
        uint powerball;
        address payable addr;
    }


    // structure for save informations about blocks from the blockchain
    struct internal_block{
        uint256 number;
        uint256 timestamp;
    }


    // tickets variables
    uint public constant TICKET_PRICE = 1 gwei;                                     // fixed price of the ticket
    ticket [] private tickets;                                                      // all tickets sells
    uint public ticketingCloses;                                                    // fixed duration of M blocks (fixed at the deployment)
    address payable[] public players;                                               // Users that play the lottery

    // blocks variables
    internal_block [] private list_blocks;                                          // list of blocks in which there is at least 1 transaction that buy a ticket
    bool block_to_add = true;                                                       // detect if a new block is to add athe the list_blocks structure (when a ticket is paied)
    uint256 public blocks_number;                                                   // number of blocks in which there is a "ticket buy"

    // owner variable related   
    address payable public lottery_owner;                                           // lottery operator
    uint256 public balance;                                                         // total amount of money made selling tickets
    
    // contracts parameters
    bool new_round;                                                                 // "true" if it's allowed create a new round
    bool lottery_closed;                                                            // "true" if the lottery has been closed 
    uint number_round;                                                              // total number of round played in the lottery
    uint256 k;                                                                      // random number defined in parameter
    uint256 random;                                                                 // random number 

    // six number extracted (from random source - blockchain)
    uint256 rand1;
    uint256 rand2;
    uint256 rand3;
    uint256 rand4;
    uint256 rand5;
    uint256 rand6;                                                                  // this will contains the powerball

    bool drawnumbers;                                                               // "true" if the numbers are alredy been extracted           
    bool prize_paied;                                                               // "true" if the prizes (NFTs) are alredy been paied   
    
    uint class_to_give;                                                             // class of NFT to assign to the winner of the lottery
    
    string tmp_text;                                                                // support variable for detect the class of prize won by the user
    bool prize_assigned;                                                            // "true" if the prize is assigned to the winner, else false

    string public LotteryStatus;                                                    // contains the status of the lottery
    bool LotteryCreatedValue;                                                       // "true" if the lottery has been created


    constructor (uint duration, uint256 k2) ERC721("Lottery TRY","MYLOTTERYCONTRACT"){

        lottery_owner = payable(msg.sender);                                        // owner of the lottery
        ticketingCloses = duration;                                                 // number of blocks accepted in a round
        blocks_number = 0;                                                          // actual blocks with a "buy ticket"
        new_round = false;                                                          // new round is created, so it's not allowed create another round
        lottery_closed = false;                                                     // the lottery is open
        number_round = 1;                                                           // the round is the first
        k = k2;                                                                     // random number selected by the lottery operator
        drawnumbers = false;
        prize_paied = false;

        LotteryCreatedValue = false;                                                 // the lottery is still not created
        LotteryStatus = "Smart Contract Deployed";

        // generation of 8 initial prizes (1 of each class)
        for(uint i=1; i <= 8; i++){
            text_token = string.concat("Classe ", Strings.toString(i));
            mint(text_token);
        }
    }


    /* Get users that have purchased al least 1 tickets */
    function getEnrolledusers() public view returns (address payable[] memory){
        return players;
    }


    function createLottery() public {
        require (msg.sender == lottery_owner, "Operation not permitted");  
        require (LotteryCreatedValue == false, "Lottery not created");  
        
        LotteryCreatedValue = true;
        LotteryStatus = "Lottery Created";
        emit LotteryCreated("TRY Lottery has been created");
    }


    function StartNewRound() public{
        // only lottery operator can reate a new round (at the condition that previous round has benn closed)
        require (msg.sender == lottery_owner, "Operation not permitted");  
        require (new_round == true, "round not ended");
        require (prize_paied == true, "GivePrize must be call");
        require (LotteryCreatedValue == true, "Lottery is still not created");

        // clear the balance of smart contract
        OwnerTakeTheMoney();
        balance = 0;                                                                // balance is 0

        // increment round number
        number_round += 1;

        /* Clean Environment */
        new_round = false;                                                          // new round in progress
        blocks_number = 0;                                                          // 0 block in which there is a "buy ticket
        lottery_closed = false;                                                     // lottery is open
        prize_paied = false;

        for(uint i =0; i < tickets.length; i++){
            delete tickets[i];                                                      // delete all old tickets
        }
        for(uint i =0; i < list_blocks.length; i++){
            delete list_blocks[i];                                                  // delete all old blocks
        }
        for(uint i =0; i < players.length; i++){
            delete players[i];                                                      // delete all old players
        }

        LotteryStatus = "Round Active";
        emit NewRoundStarted("New round");
    }


    /* Buy ticket input:     
        - 5 input numbers between 1 and 69 
        - 1 number (powerball) between 1 and 26 */
    function buy(uint number1, uint number2,
                 uint number3, uint number4,
                 uint number5,uint powerball) public payable {
        
        // lottery constrains
        if (msg.value != TICKET_PRICE){
            emit WrongPriceTicket(msg.sender);
            revert();
        }

        require (blocks_number < ticketingCloses, "Round is closed");
        require (new_round == false, "new round still not started - user can buy ticket only during active round");
        require (lottery_closed == false, "Lottery has been closed from the operator");
        
        // require of numbers constrains
        require(number1 >= 1 && number1<= 69, "Number 1 should be between 1 and 69");
        require(number2 >= 1 && number2<= 69, "Number 2 should be between 1 and 69");
        require(number3 >= 1 && number3<= 69, "Number 3 should be between 1 and 69");
        require(number4 >= 1 && number4<= 69, "Number 4 should be between 1 and 69");
        require(number5 >= 1 && number5<= 69, "Number 51 should be between 1 and 69");
        require(powerball >= 1 && powerball<= 26, "Powerball number should be between 1 and 26");

        require(LotteryCreatedValue == true, "Lottery is still not created");

        // determine if block_number need to be incremented
        block_to_add = true;
        for(uint i=0; i < list_blocks.length; i++){
            // if the block is yet in the list_blocks, don't add it.
            if (block.number == list_blocks[i].number){
                block_to_add = false;
            }
        }
        if (block_to_add == true){
            
            block_to_add = false;                                                               // reset for the next check
            blocks_number +=1;
            
            internal_block memory tmp_block;                                                    // new "internal_block"
            tmp_block.number = block.number;
            tmp_block.timestamp = block.timestamp;
            list_blocks.push(tmp_block);
        }

        // Create a ticket to push in the list
        ticket memory tmp_ticket;
        tmp_ticket.number[0] = number1;
        tmp_ticket.number[1] = number2;
        tmp_ticket.number[2] = number3;
        tmp_ticket.number[3] = number4;
        tmp_ticket.number[4] = number5;
        tmp_ticket.powerball  = powerball;
        tmp_ticket.addr  = payable(msg.sender);
        tickets.push(tmp_ticket);

        // push player in the "players" list
        players.push(payable(msg.sender));

        balance += TICKET_PRICE;

        emit TicketEmitted(msg.sender);

        if (blocks_number >= ticketingCloses){
            LotteryStatus = "Round Closed";
        }
    }
    

    function drawNumbers() public returns(uint256,uint256,uint256,uint256,uint256,uint256){
        require (msg.sender == lottery_owner, "Only the lottery operator can draw the numbers");
        require (new_round == true || blocks_number == ticketingCloses, "The round is still ongoing"); // require the round is closed
        require (drawnumbers == false, "Number already drawn!");

        require(LotteryCreatedValue == true, "Lottery is still not created");

        random = randomNumber(); // generate the random number
        //split the random number in 6 part
        rand1 = ((random >> 5) % 69) +1;
        rand2 = ((random >> 10) % 69) +1;
        
        if (rand1 == rand2){
            rand2 = ((random >> 11) % 69) + 1;
        }
            
        rand3 = ((random >> 15) % 69) +1;
        if (rand3 == rand1 || rand3 == rand2){
            rand3 = ((random >> 16) % 69) +1;
        }
        rand4 = ((random >> 20) % 69) +1;
        if (rand4 == rand1 || rand4 == rand2 || rand4 == rand3){
            rand4 = ((random >> 21) % 69) + 1;
        }
        rand5 = ((random >> 25) % 69) +1;
        if (rand5 == rand1 || rand5 == rand2 || rand5 == rand3 || rand5 == rand4){
            rand5 = ((random >> 26) % 69) + 1;
        }
        rand6 = ((random >> 30) % 26) +1;
        if (rand6 == rand1 || rand6 == rand2 || rand6 == rand3 || rand6 == rand4 || rand6 == rand5){
            rand6 = ((random >> 31) % 69) + 1;
        }
        drawnumbers = true;
        
        emit RandomNumbersExtracted(rand1, rand2, rand3, rand4, rand5, rand6);
        LotteryStatus = "Number Drawn";

        return (rand1, rand2, rand3, rand4, rand5, rand6);
    }


    function givePrizes() public payable{
        require (msg.sender == lottery_owner, "Lottery Manager only");
        require (new_round == true || blocks_number == ticketingCloses, "Round need to be close");             // require the round is closed
        require (drawnumbers == true, "Numbers not extracted!");

        require(LotteryCreatedValue == true, "Lottery is still not created");

        //owner take the money
        OwnerTakeTheMoney();

        // for each ticket won, transfer ownership of the token, if a mined token exists,
        // otherwise mine the token and transfer ownership
        for(uint i = 0; i < tickets.length; i++){

            uint number_ok = 0;
            uint powerball_ok = 0;
            
            for(uint j = 0; j < 5; j++){
                if (tickets[i].number[j] == rand1 || tickets[i].number[j] == rand2 || tickets[i].number[j] == rand3 || tickets[i].number[j] == rand4 || tickets[i].number[j] == rand5) {
                    number_ok += 1; 
                }
            }
            
            if (tickets[i].powerball == rand6){
                    powerball_ok += 1;
            }
            
            if (number_ok != 0 || powerball_ok != 0){
                detect_token_to_transfer(number_ok, powerball_ok, tickets[i].addr);
            }
        }

        // now the lottery owner can open a new round
        new_round = true;
        
        // can extract again the numbers
        drawnumbers = false;
        prize_paied = true;

        LotteryStatus = "Prizes paied!";
        emit PrizePaid("Prizes have been paied - round is close");
        //emit RoundClosed(number_round);
    }


    // function for close the lottery
    function close_lottery() public payable{
        require (msg.sender == lottery_owner, "Lottery Manager only");
        require(LotteryCreatedValue == true, "Lottery is still not created");

        lottery_closed = true;

        // user refund - only if a round is active
        if (new_round == false){
            emit Refund(balance);
            for(uint i =0; i < tickets.length; i++){
                refund(tickets[i].addr);
            }
        }
        
        // the lottery operator can open a new round
        new_round = true;
        prize_paied = true;

        LotteryStatus = "Lottery Closed";
        emit LotteryClosed();
    }


    // ------------------------------------------------------------------------------------------------------------------------------
    // --------------------------------------       Support Functions        --------------------------------------------------------
    // ------------------------------------------------------------------------------------------------------------------------------


    // function for send a refund - visible only internally
    function refund (address payable user) private {
        user.transfer(TICKET_PRICE);
    }


    function OwnerTakeTheMoney() private{
        // transfer money earned from tickets to lottery_owner
        lottery_owner.transfer(balance);
        balance = 0;
    }


    function randomNumber() private returns (uint256){
        random = uint256(keccak256(abi.encodePacked(list_blocks[list_blocks.length - 1].number + k +list_blocks[list_blocks.length - 1].timestamp)));
        return random;
    }


    function mint(string memory tokenURI) private returns (uint256) {
        require (msg.sender == lottery_owner, "Lottery Manager only");  

        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        
        _mint(lottery_owner, newItemId);
        _setTokenURI(newItemId, tokenURI);
        
        return newItemId;
    }


    function compareStrings(string memory a, string memory b) public pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }


    function detect_token_to_transfer(uint number_taken, uint powerball_taken, address winner_) public payable{
        
        prize_assigned = false;

        if (powerball_taken == 1){
            if (number_taken == 1){
                class_to_give = 6;
            }else if (number_taken == 2){
                class_to_give = 5;
            }else if (number_taken == 3){
                class_to_give = 4;
            }else if (number_taken == 4){
                class_to_give = 3;
            }else if (number_taken == 5){
                class_to_give = 1;
            }else{
                class_to_give = 8;
            }
        }else{
            if (number_taken == 1){
                class_to_give = 7;
            }else if (number_taken == 2){
                class_to_give = 6;
            }else if (number_taken == 3){
                class_to_give = 5;
            }else if (number_taken == 4){
                class_to_give = 4;
            }else if (number_taken == 5){
                class_to_give = 2;
            }
        }
        
        tmp_text = string.concat("Classe ", Strings.toString(class_to_give));

        // search a NFT to transfer at the winners of lottery
        for (uint i=1; i <= _tokenIds.current(); i++){
            if(compareStrings(tokenURI(i),tmp_text)){           // compare class
                if (ownerOf(uint256(i)) == lottery_owner){      // check if is still of the lottery operator 
                    transferFrom(lottery_owner, winner_, i);    // transfer the NFT
                    prize_assigned = true;
                }
            }
        }
        
        // mine the new token if needed
        if (prize_assigned == false){
            uint token_tmp = mint(tmp_text);
            transferFrom(lottery_owner,winner_,token_tmp);
        }
    }


    fallback () external {
        return;
    }

}