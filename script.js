document.addEventListener("DOMContentLoaded", () => {
  const connectButton = document.getElementById("connectButton");
  const submitButton = document.getElementById("submitButton");
  const transactionSection = document.getElementById("transactionSection");
  const statusTable = document.getElementById("statusTable");
  const statusDiv = document.getElementById("status");
  const desiredChainId = 167000; // Chain ID for the desired network
  let web3;
  let rowIndex = 1; // Initialize row index for the table

  const checkChainId = async () => {
    const chainId = await web3.eth.getChainId();
    if (chainId !== desiredChainId) {
      await switchToDesiredNetwork();
    }
  };

  const switchToDesiredNetwork = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: web3.utils.toHex(desiredChainId) }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: web3.utils.toHex(desiredChainId),
                chainName: "Taiko",
                rpcUrls: ["https://rpc.ankr.com/taiko"], // Add the RPC URL
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                blockExplorerUrls: ["https://taikoscan.io"], // Add block explorer URL
              },
            ],
          });
        } catch (addError) {
          console.error("Error adding new network:", addError);
          statusDiv.innerText = "Error adding new network: " + addError.message;
        }
      } else {
        console.error("Error switching network:", switchError);
        statusDiv.innerText = "Error switching network: " + switchError.message;
      }
    }
  };

  const sendTransaction = async (txObject, nonce) => {
    try {
      const accounts = await web3.eth.getAccounts();
      const account = accounts[0];

      const txToSend = {
        ...txObject,
        from: account,
        nonce: nonce,
        maxPriorityFeePerGas: web3.utils.toWei("0.1", "gwei"),
        maxFeePerGas: web3.utils.toWei("0.1", "gwei"),
      };
      console.log(txToSend)
      const txHash = await web3.eth.sendTransaction(txToSend);
      console.log(txHash);
      return txHash.transactionHash;
    } catch (error) {
      throw new Error(`Error sending transaction: ${error.message}`);
    }
  };

  const displayTransactionLinks = (txHash) => {
    const txExplorerUrl = `https://taikoscan.io/tx/${txHash}`;

    // Create table row and cells
    const row = statusTable.insertRow();
    const indexCell = row.insertCell(0);
    const hashCell = row.insertCell(1);

    // Set index and hash content
    indexCell.textContent = rowIndex++;
    const link = document.createElement("a");
    link.href = txExplorerUrl;
    link.target = "_blank";
    link.textContent = txHash;
    hashCell.appendChild(link);
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const playBeep = () => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 note
    gainNode.gain.setValueAtTime(3, audioCtx.currentTime);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.1); // Beep duration 0.1 seconds
  };

  connectButton.addEventListener("click", async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        web3 = new Web3(window.ethereum);
        await checkChainId();
        transactionSection.style.display = "block";
        statusDiv.innerText = "MetaMask connected";
      } catch (error) {
        console.error(error);
        statusDiv.innerText = "Error connecting to MetaMask";
      }
    } else {
      alert("MetaMask is not installed. Please install it to use this app.");
    }
  });

  submitButton.addEventListener("click", async () => {
    const ethAmount = parseFloat(document.getElementById("ethAmount").value);
    const loopCount = parseInt(document.getElementById("loopCount").value);
    if (isNaN(ethAmount) || ethAmount <= 0) {
      alert("Please enter a valid amount of ETH.");
      return;
    }
    if (isNaN(loopCount) || loopCount <= 0) {
      alert("Please enter a valid number of loops.");
      return;
    }

    const depositAbi = {
      func: "deposit",
      params: [],
    };
    const withdrawAbi = {
      func: "withdraw",
      params: [web3.utils.toWei(ethAmount.toString(), "ether")],
    };

    const depositData = web3.eth.abi.encodeFunctionCall(
      {
        name: depositAbi.func,
        type: "function",
        inputs: depositAbi.params,
      },
      []
    );

    const withdrawData = web3.eth.abi.encodeFunctionCall(
      {
        name: withdrawAbi.func,
        type: "function",
        inputs: [
          {
            type: "uint256",
            name: "amount",
          },
        ],
      },
      [web3.utils.toWei(ethAmount.toString(), "ether")]
    );

    const accounts = await web3.eth.getAccounts();
    const account = accounts[0];
    let nonce = await web3.eth.getTransactionCount(account, "latest"); // Get latest nonce

    for (let i = 0; i < loopCount; i++) {
      playBeep(); // Play beep sound at the start of each loop

      try {
        // 1st transaction
        const tx1 = {
          to: "0xA51894664A773981C6C112C43ce576f315d5b1B6",
          value: web3.utils.toWei(ethAmount.toString(), "ether"), // Convert ETH to Wei
          gas: 46674,
          data: depositData
        };
        sendTransaction(tx1, nonce)
          .then((txHash1) => {
            console.log("Transaction 1 sent with hash:", txHash1);
            displayTransactionLinks(txHash1);
          })
          .catch((error) => {
            console.error("Error sending Transaction 1:", error.message);
            statusDiv.innerText =
              "Error sending transactions: " + error.message;
          });

        nonce++; // Increment nonce for the next transaction

        // 2nd transaction
        const tx2 = {
          to: "0xA51894664A773981C6C112C43ce576f315d5b1B6",
          value: "0",
          gas: 54486,
          data: withdrawData
        };
        const txHash2 = await sendTransaction(tx2, nonce);
        console.log("Transaction 2 sent with hash:", txHash2);
        displayTransactionLinks(txHash2);

        nonce++; // Increment nonce for the next transaction

        // Wait for the 2nd transaction to complete
        await web3.eth.getTransactionReceipt(txHash2);

        // Delay for 2 seconds before the next iteration
        await delay(2000);
      } catch (error) {
        console.error("Error in loop:", error.message);
        statusDiv.innerText = "Error in loop: " + error.message;
        return;
      }
    }

    statusDiv.innerText = "All transactions initiated";
  });
});
