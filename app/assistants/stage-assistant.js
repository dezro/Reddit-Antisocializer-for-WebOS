function StageAssistant() {
}

StageAssistant.prototype.setup = function() {
    Reddit.loadAccounts();
    Reddit.currentAccount = Reddit.accounts[0];
    Reddit.startCheckingEnvelope();
    
    this.controller.pushScene("reddit");
}

StageAssistant.prototype.cleanup = function() {
    Reddit.stopCheckingEnvelope();
}
