const fs = require('fs');
const xml2js = require('xml2js');
const { convertArrayToCSV } = require('convert-array-to-csv');
const moment = require('moment');

var csv = require("fast-csv");

class Main {

    constructor(){
        this.parser = new xml2js.Parser();
        this.data = [];
        this.rawXmlDataToValues = {};
        this.xmlColumnOrdered = [];
        this.mappedColumnOrdered = [];
    }

    setRawDataToValuesFromXml(xmlFields){
        xmlFields.forEach((obj) => {
            if (!obj.$ || !obj['_'] || !obj.$['xfdf:original']){
                return;
            }
            let rawFieldName = obj.$['xfdf:original'];
            let value = obj['_'];
            this.rawXmlDataToValues[rawFieldName] = value;
        });
    }

    setMappingArraysFromMappingCsv(){

        var pushDataToMappingArrays = function(arr){
            this.xmlColumnOrdered.push(arr[1]);
            this.mappedColumnOrdered.push(arr[0]);
        }.bind(this);

        return new Promise(function(resolve, reject){
            csv.fromPath("./mappingFile/mapping.csv")
                .on("data", pushDataToMappingArrays)
                .on("end", function(){
                    resolve();
                });
            }
        );
    }

    readFileAndMakeRow(fileName){
        return new Promise(function(resolve, reject){
            console.log("Loading file: " + fileName);
            fs.readFile('./xml/' + fileName, function(err, data) {
                this.parser.parseString(data, function (err, result) {
                    if (err || !result || !result.fields || !result.fields.field) {
                        console.log("Error in file: " + fileName);
                        resolve(null);
                    }

                    this.setRawDataToValuesFromXml(result.fields.field);

                    var row = [];

                    this.xmlColumnOrdered.forEach(rawColumn => {
                        row.push(this.rawXmlDataToValues[rawColumn] || '');
                    });

                    resolve(row);
                }.bind(this));
            }.bind(this));
        }.bind(this));
    }

    getAllXmlFileNames(dirname){
        return new Promise(function(resolve, reject){
            fs.readdir(dirname, function(err, filenames){
                if (err){
                    console.log("Invalid file found");
                    resolve(null);
                }
                var filteredFileNames = filenames.filter((name) => {
                    return name.indexOf('xml') !== -1;
                });
                resolve(filteredFileNames);
            });
        });
    }

    async run(){

        console.log("start");

        await this.setMappingArraysFromMappingCsv();
        
        if (this.mappedColumnOrdered.length != this.xmlColumnOrdered.length){
            console.log("Mapping File In Valid");
            return;
        }

        var fileNames = await this.getAllXmlFileNames('./xml');

        for (var i = 0; i < fileNames.length; i++){
            var row = await this.readFileAndMakeRow(fileNames[i]);
            if (row){
                this.data.push(row);
            }
        }

        var csvString = convertArrayToCSV(this.data, {
            header: this.mappedColumnOrdered,
            separator: ','
          });


        var path = "./results/converted" + moment().format('YYYY-MM-DD-hhmmss') + ".csv";

        fs.writeFile(path, csvString, function(err) {
            if(err) {
                return console.log(err);
            }
        
            console.log("The file was saved!");
        }); 

        console.log("finished");
    }
}

var obj = new Main();
obj.run();