import React, { Component } from 'react';
import './FaucetAdmin.css';
import axios from "axios";
import config from "react-global-configuration";
import timespan from "timespan";
import { isNumber } from 'util';

class FaucetAdmin extends Component {
   constructor(props){
     super(props);
     this.state = { useraccount: "", adminenabled: false,operatoraddress: "", inputText: "",requestrunning: false, owneraddress:""};
     this.handleFaucetEnable = this.handleFaucetEnable.bind(this);
     this.handleFaucetTokenChange = this.handleFaucetTokenChange.bind(this);
     this.handleChange = this.handleChange.bind(this);
   }


   handleChange(e){
    this.setState({ inputText: e.target.value });
   }
   clearMessages(event) {
    this.setState({ faucetresponse: null, fauceterror: null });
  }

  handleFaucetEnable(event){
    this.clearMessages();
    let apiUrl = config.get("apiurl") + "/faucettoggle";
    axios
      .get(apiUrl)
      .then(response => {
        this.setState({ requestrunning: true });
        if (response.status === 200) {
          this.setState({
            faucetresponse: {
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
      event.preventDefault();
}

handleFaucetTokenChange(){
  this.clearMessages();
  if(isNumber(parseInt(this.state.inputText))){
    let apiUrl = config.get("apiurl") + "/changetokenamount/"+this.state.inputText;
    axios
      .get(apiUrl)
      .then(response => {
        this.setState({ requestrunning: true });
        if (response.status === 200) {
          this.setState({
            faucetresponse: {
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
  }
  
}

  // componentWillMount(){}  
   async getData(){
     setTimeout(()=>{
      this.setState({useraccount:localStorage.getItem("useraccount")});
      if(this.state.useraccount===this.state.operatoraddress || this.state.useraccount === this.state.owneraddress)
      {
        this.setState({adminenabled:true});
      }
     },500);
   }
   async componentDidMount(){
     this.getOperatorAddress();
     
   }

   getOperatorAddress(){
    let apiUrl = config.get("apiurl") + "/operatoraddress";

    axios
    .get(apiUrl)
    .then(response =>{
      if(response.status == 200){
        this.setState({operatoraddress:response.data.operatoraddress, owneraddress:response.data.owneraddress});
        this.getData();
      }

    })
    .catch(error => {
      if(!error || !error.response){
        alert(error.message);
      }
    })

   }

  render() {
    if(this.state.adminenabled === true){
      return (

        <section className="section">
        <div className="container bottompadding">
            <div className="field">
              <label className="label">
                Enter token amount to change
              </label>
              <div className="control">
                <input
                  className="input is-rounded"
                  type="text"
                  placeholder="Enter token amount"
                  onChange={this.handleChange}
                  value={this.state.inputText}
                />
              </div>
            </div>
            <div className="field is-grouped">
              <div className="control">
                <button onClick={this.handleFaucetTokenChange}
                  className="button is-link is-rounded"
                >
                  Change
                </button>
              </div>
              <div className="control">
                <button onClick={this.handleFaucetEnable}
                  className="button is-link is-rounded"
                >
                  Toggle faucet
                </button>
              </div>
            </div>
            {this.state.requestrunning}
            <div className="container">
            {this.state.faucetresponse ? (
              <article
                className="message is-success"
                onClick={this.clearMessages}
              >
                <div className="message-body">
                  <p>Toggled faucet {this.state.faucetresponse.address}.</p>
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
                </div>
              </article>
            ) : (
              <p />
            )}
            </div>
        </div>
        </section>   
      );
    }
    else{
      return (
        <div>
        </div>
      );
    }

  }
}

export default FaucetAdmin;