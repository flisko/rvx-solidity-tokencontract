var RVXToken = artifacts.require("RVXToken");

contract('RVXToken', function(accounts) {
    it("Owner balance is correct", function() {
      var token;
      var owner = '0x07deE23B955e7dffff6ba88E8Dc632E38c4b23A8';
      return RVXToken.deployed(owner)
        .then(function(instance){
         token = instance;
         return token.balanceOf.call(owner);
        }).then(function(result){
         assert.equal(result, 4000000000000000000000000000, 'Owner balance is wrong');
        })
    });

    it("Owner is constructor parameter", function() {
        var token;
        var owner = '0x07deE23B955e7dffff6ba88E8Dc632E38c4b23A8';
        return RVXToken.deployed()
          .then(function(instance){
           token = instance;
           return token._owner.call();
          }).then(function(result){
           assert.equal(result, owner, 'owner is wrong');
          })
      });

      it("is minter", function() {
        var token;
        var owner = '0x07deE23B955e7dffff6ba88E8Dc632E38c4b23A8';
        return RVXToken.deployed(owner)
          .then(function(instance){
           token = instance;
           return token.isMinter.call(owner);
          }).then(function(result){
           assert.equal(result, true, 'owner is wrong');
          })
      });


});