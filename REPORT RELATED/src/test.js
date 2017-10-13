/* jslint node: true */
/* global before, afterEach, after, featureFile, scenarios, steps 
This is driver script which drive our automation execution 
*/

"use strict";
var Yadda = require('yadda');
var webdriver = require('selenium-webdriver');
var config = require('config');
var fs = require('fs');
var mkdirp = require('mkdirp')
//console.log("TEST.JS");
//console.log(process.argv);

var automationLib = require('@markit/test-automation-framework');
var funLib = automationLib.FunctionLibrary;

var TestRunner = function(){
    var functionLibrary;
    var driver;
}

TestRunner.prototype.execute = function(){
    var self = this;
    Yadda.plugins.mocha.StepLevelPlugin.init();

    if(!this.driver || !this.driver.getSession()){
        var browser = config.get('browser');
        this.driver = new webdriver
                .Builder()
                .usingServer()
                .withCapabilities({'browserName': browser})
                .build();
    }
    if(!this.functionLibrary){
        this.functionLibrary = new funLib(this.driver);
    }

    var directories = self.getDirectories('src/');

    directories.forEach(function(directory) {
        var features = new Yadda.FeatureFileSearch('src/' + directory + '/features/');
        features.each(function(file) {
            featureFile(file, function(feature) {
                
                before(function(done) {
                    if(!self.driver || !self.driver.getSession()){
                        var browser = config.get('browser');
                        self.driver = new webdriver
                            .Builder()
                            .usingServer()
                            .withCapabilities({'browserName': browser})
                            .build();

                        self.driver.manage().timeouts().implicitlyWait(10000);
                    }

                    if(!self.functionLibrary){
                        self.functionLibrary = new funLib(self.driver);
                    }

                    self.functionLibrary.fnLogInfo('Start of the automation test Execution');
                    done();
                });

                scenarios(feature.scenarios, function(scenario) {
                    var libraries = self.getStepFile(file, directory);
                    
                    steps(scenario.steps, function(step, done) {
                        self.executeInFlow(function() {
                            var url = self.getParameterValue('--url');
                            var param = { driver: self.driver };
                            if(url !==''){
                                param['customUrl'] = url;
                            }
                            
                           new Yadda.Yadda(libraries, param).yadda(step);
                        }, done);
                    });
                });

                afterEach(function() {
                    self.takeScreenshotOnFailure(this.currentTest);
                });

                after(function(done) {
                    self.functionLibrary.fnLogInfo('End of the automation test Execution');
                    self.driver.quit().then(done);
                });
            });
        });
    });
}

TestRunner.prototype.executeInFlow = function(fn, done) {
    webdriver.promise.controlFlow().execute(fn).then(function() {
        done();
    }, done);
}

TestRunner.prototype.takeScreenshotOnFailure = function(test) {
    
    //DANISH
    var dirout = this.getParameterValue("--d");
    

    if (test.status != 'passed') {
        //var path = 'screenshots/' + test.title.replace(/\W+/g, '_').toLowerCase() + '.png';
        var fs = require('fs');
        mkdirp(dirout+'/screenshots/');
        var path = dirout+'/screenshots/' + test.title.replace(/\W+/g, '_').toLowerCase() + '.png';
        this.driver.takeScreenshot().then(function(data) {
            fs.writeFileSync(path, data, 'base64');
        });
    }
}

TestRunner.prototype.getStepFile = function(file, directory){
    var temp = file.split('\\');
    var step = temp[temp.length-1].split('.')[0];
    
    if(directory && directory!==''){
        return require('./'+ directory +'/step-definition/' + step +'-step');
    }
    return require('./step-definition/' + step +'-step');
}

TestRunner.prototype.getDirectories = function(path) {
    var module = this.getParameterValue("--m");
    
    if(module && module!==""){
        var moduleDir = fs.readdirSync(path).filter(function (file) {
            if(file === module){
                return fs.statSync(path+'/'+file).isDirectory();
            }else{
                return false;
            }
        });

        if(moduleDir.length === 0){
            this.functionLibrary.fnLogError(module + " is not a valid module");
        }
        return moduleDir;
    }

    var directories = fs.readdirSync(path).filter(function (file) {
        return fs.statSync(path+'/'+file).isDirectory();
    });
  
    return directories;
}

TestRunner.prototype.getParameterValue = function(paramName){
    var processArg = process.argv;
    var indexOfParam = processArg.indexOf(paramName);
    if(indexOfParam>-1){
        var t = processArg[indexOfParam + 1];
        if(t && t!==undefined && t!=="undefined" && t!=="" ){
            return t;
        }
    }
    return "";
}
var runner = new TestRunner();
runner.execute();