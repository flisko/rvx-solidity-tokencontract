import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  Web3ReactProvider,
  useWeb3React,
  UnsupportedChainIdError
} from "@web3-react/core";
import {
  NoEthereumProviderError,
  UserRejectedRequestError as UserRejectedRequestErrorInjected
} from "@web3-react/injected-connector";
import {
  URI_AVAILABLE,
  UserRejectedRequestError as UserRejectedRequestErrorWalletConnect
} from "@web3-react/walletconnect-connector";
import { UserRejectedRequestError as UserRejectedRequestErrorFrame } from "@web3-react/frame-connector";
import { Web3Provider } from "@ethersproject/providers";
import { formatEther } from "@ethersproject/units";

import { network, walletconnect } from "./connectors";
import { useEagerConnect, useInactiveListener } from "./hooks";
import { Spinner } from "./Spinner";

const connectorsByName = {
  Network: network
};

function getErrorMessage(error) {
  if (error instanceof NoEthereumProviderError) {
    return "No Ethereum browser extension detected, install MetaMask on desktop or visit from a dApp browser on mobile.";
  } else if (error instanceof UnsupportedChainIdError) {
    return "You're connected to an unsupported network.";
  } else if (
    error instanceof UserRejectedRequestErrorInjected ||
    error instanceof UserRejectedRequestErrorWalletConnect ||
    error instanceof UserRejectedRequestErrorFrame
  ) {
    return "Please authorize this website to access your Ethereum account.";
  } else {
    console.error(error);
    return "An unknown error occurred. Check the console for more details.";
  }
}

function getLibrary(provider) {
  const library = new Web3Provider(provider);
  library.pollingInterval = 8000;
  return library;
}

function App() {

  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <MyComponent />
    </Web3ReactProvider>
  );
}


function MyComponent() {
  
  const context = useWeb3React();
  const {
    connector,
    library,
    chainId,
    account,
    activate,
    deactivate,
    active,
    error
  } = context;
  const [input, setInput] = React.useState('');

  // handle logic to recognize the connector currently being activated
  const [activatingConnector, setActivatingConnector] = React.useState();
  React.useEffect(() => {
    if (activatingConnector && activatingConnector === connector) {
      setActivatingConnector(undefined);
    }
  }, [activatingConnector, connector]);
  // handle logic to eagerly connect to the injected ethereum provider, if it exists and has granted access already
  const triedEager = useEagerConnect();

  // handle logic to connect in reaction to certain events on the injected ethereum provider, if it exists
  useInactiveListener(!triedEager || !!activatingConnector);
    
  // set up block listener
  const [blockNumber, setBlockNumber] = React.useState();
  React.useEffect(() => {
    if (library) {
      let stale = false;

      library
        .getBlockNumber()
        .then(blockNumber => {
          if (!stale) {
            setBlockNumber(blockNumber);
          }
        })
        .catch(() => {
          if (!stale) {
            setBlockNumber(null);
          }
        });

      const updateBlockNumber = blockNumber => {
        setBlockNumber(blockNumber);
      };
      library.on("block", updateBlockNumber);

      return () => {
        library.removeListener("block", updateBlockNumber);
        stale = true;
        setBlockNumber(undefined);
      };
    }
  }, [library, chainId]);
  // activate infura provider 
  React.useEffect(() => {
    context.activate(network);
  });
  return (
    <div style={{ padding: "1rem" }}>
      <h1 style={{ margin: "0", textAlign: "right" }}>
        {active ? "🟢" : error ? "🔴" : "🟠"}
      </h1>
      <h3
        style={{
          display: "grid",
          gridGap: "1rem",
          gridTemplateColumns: "1fr min-content 1fr",
          maxWidth: "20rem",
          lineHeight: "2rem",
          margin: "auto"
        }}
      >
        <h1>Address:</h1>
        <input value={input} onInput={e => setInput(e.target.value)}/>
        
        <span>Chain Id</span>
        <span role="img" aria-label="chain">
          ⛓
        </span>
        <span>{chainId === undefined ? "..." : chainId}</span>

        <span>Block Number</span>
        <span role="img" aria-label="numbers">
          🔢
        </span>
        <span>
          {blockNumber === undefined
            ? "..."
            : blockNumber === null
            ? "Error"
            : blockNumber.toLocaleString()}
        </span>

        <span>Account</span>
        <span role="img" aria-label="robot">
          🤖
        </span>
        <span>
          {account === undefined
            ? "..."
            : account === null
            ? "None"
            : `${account.substring(0, 6)}...${account.substring(
                account.length - 4
              )}`}
        </span>

        <span>Balance</span>
        <span role="img" aria-label="gold">
          💰
        </span>
      </h3>
      <hr style={{ margin: "2rem" }} />
      <div
        style={{
          display: "grid",
          gridGap: "1rem",
          gridTemplateColumns: "1fr 1fr",
          maxWidth: "20rem",
          margin: "auto"
        }}
      >
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}
      >
        {(active || error) && (
          <button
            style={{
              height: "3rem",
              marginTop: "2rem",
              borderRadius: "1rem",
              borderColor: "red",
              cursor: "pointer"
            }}
            onClick={() => {
              deactivate();
            }}
          >
            Deactivate
          </button>
        )}

        {!!error && (
          <h4 style={{ marginTop: "1rem", marginBottom: "0" }}>
            {getErrorMessage(error)}
          </h4>
        )}
      </div>

      <hr style={{ margin: "2rem" }} />

      <div
        style={{
          display: "grid",
          gridGap: "1rem",
          gridTemplateColumns: "fit-content",
          maxWidth: "20rem",
          margin: "auto"
        }}
      >
        {!!(library && account) && (
          <button
            style={{
              height: "3rem",
              borderRadius: "1rem",
              cursor: "pointer"
            }}
            onClick={() => {
              library
                .getSigner(account)
                .signMessage("👋")
                .then(signature => {
                  window.alert(`Success!\n\n${signature}`);
                })
                .catch(error => {
                  window.alert(
                    "Failure!" +
                      (error && error.message ? `\n\n${error.message}` : "")
                  );
                });
            }}
          >
            Sign Message
          </button>
        )}
      </div>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
