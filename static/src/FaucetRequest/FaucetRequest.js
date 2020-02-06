import React, { Component } from "react";
import "./FaucetRequest.css";
import Eth from "ethjs";
import config from "react-global-configuration";
import axios from "axios";
import timespan from "timespan";

export class FaucetRequest extends Component {
  constructor(props) {
    super(props);
    this.state = { targetAccount: "", requestrunning: false,faucetenabled: false , useraccount:""};

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.clearMessages = this.clearMessages.bind(this);
    this.faucetEnabled = this.faucetEnabled.bind(this);
    this.updateAddress = this.updateAddress.bind(this);
    this.isLocked = this.isLocked.bind(this);
  }
  async updateAddress(value){
    this.setState({useraccount:value});
  }

  handleChange(event) {
    this.setState({ targetAccount: event.target.value });
  }

  clearMessages(event) {
    this.setState({ faucetresponse: null, fauceterror: null });
  }
 async faucetEnabled() {
    let apiUrl = config.get("apiurl") + "/faucetenabled/";
    axios
    .get(apiUrl)
    .then(response => {
      if(response.status ===200){
        if(response.data.faucetenabled[0]){
          this.setState({faucetenabled:false});
        }else{
          this.setState({faucetenabled:true});
        }
      }
    })
    .catch(error => {
      if (!error || !error.response) {
        this.setState({
          fauceterror: {
            message: 'Error getting faucet status: ' + error.message,
          }
        });
        return;
      }
    });
  }

  handleSubmit(event) {
    this.clearMessages();
    this.faucetEnabled();
    if (Eth.isAddress(this.state.targetAccount)) {
      this.setState({ requestrunning: true });

      let apiUrl = config.get("apiurl") + "/donate/" + this.state.targetAccount;
      axios
        .get(apiUrl)
        .then(response => {
          this.setState({ requestrunning: true });
          if (response.status === 200) {
            this.setState({
              faucetresponse: {
                address: response.data.address,
                amount: response.data.amount,
                txhash: response.data.txhash,
                etherscanlink:
                  config.get("etherscanroot") + "/tx/" + response.data.txhash
              }
            });
            return;
          }
        })
        // Catch any error here
        .catch(error => {
          this.setState({ requestrunning: false });
          if (!error || !error.response) {
            this.setState({
              fauceterror: {
                message: 'Error connecting to the API: ' + error.message,
              }
            });
            return;
          }
          if (error.response.status === 403) {
            let t = new timespan.TimeSpan(error.response.data.duration, 0, 0);
            this.setState({
              fauceterror: {
                message: error.response.data.message,
                duration: error.response.data.duration,
                timespan: t
              }
            });
            return;
          }
        });
    } else {
      this.setState({ fauceterror: { message: "invalid address" } });
    }
    event.preventDefault();
  }

  componentWillMount() {

   
  }
  isLocked() {
    window.wan3.eth.getAccounts(function(err, accounts){
       if (err != null) {
          return(0);
       }
       else if (accounts.length === 0) {
        return(0);
       }
       else {
          return(1);
       }
    });
 }
  async componentDidMount() {
    localStorage.clear();
    this.faucetEnabled();
     window.addEventListener('load', function () {
      if (typeof wan3 !== 'undefined') {        
          if (window.wan3.currentProvider.isWanMask === true) {
              window.wan3.eth.getAccounts(function(err,result){
                if(err!=null){
  
                }else if(result.length===0){
                  
                }else{
                  console.log("result: "+result);
                  localStorage.setItem("useraccount",result);
                }
              })
          }
        }
          
  });
}

  render() {
    return (
      <div className="">
        <section className="section">
          <div className="container bottompadding">
            <form onSubmit={this.handleSubmit}>
              <div className="field">
                <label className="label">
                  Enter your testnet account address
                </label>
                <div className="control">
                  <input
                    className="input is-primary"
                    type="text"
                    placeholder="Enter your testnet account address"
                    value={this.state.targetAccount}
                    onChange={this.handleChange}
                  />
                </div>
              </div>
              <div className="field is-grouped">
                <div className="control">
                  <button
                    disabled={this.state.faucetenabled}
                    className="button is-link"
                  >
                    Send me testnet RVX
                  </button>
                </div>
              </div>
            </form>
          </div>
          {this.state.requestrunning}

          <div className="container">
            {this.state.faucetresponse ? (
              <article
                className="message is-success"
                onClick={this.clearMessages}
              >
                <div className="message-body">
                  <p>Test ETH sent to {this.state.faucetresponse.address}.</p>
                  <p>
                    Transaction hash{" "}
                    <a
                      target="_new"
                      href={this.state.faucetresponse.etherscanlink}
                    >
                      {this.state.faucetresponse.txhash}
                    </a>
                  </p>
                </div>
              </article>
            ) : (
              <p />
            )}
            {this.state.fauceterror ? (
              <article
                className="message is-danger"
                onClick={this.clearMessages}
              >
                <div className="message-body">
                <b>{this.state.fauceterror.message}</b><br/>
                  {this.state.fauceterror.timespan ? (
                    <span>
                      You are greylisted for another{" "}
                      {this.state.fauceterror.timespan.hours} hours and{" "}
                      {this.state.fauceterror.timespan.minutes} minutes.
                    </span>
                  ) : (
                    <span />
                  )}
                </div>
              </article>
            ) : (
              <p />
            )}
          </div>
        </section>
      </div>
    );
  }
}

export default FaucetRequest;
