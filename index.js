const fs = require('fs');
const xml2js = require('xml2js');
const { convertArrayToCSV } = require('convert-array-to-csv');
const moment = require('moment');

const mappings = require('./mappings');


class Main {

    constructor(){
        this.parser = new xml2js.Parser();
        this.data = [];
        this.rawDataToValues = {};
        this.rawColumnOrdered = Object.keys(mappings);
        this.mappedColumnOrdered = this.makeMappedColumnArray(this.rawColumnOrdered);
    }

    makeMappedColumnArray(rawColumnOrdered){
        return rawColumnOrdered.map(rawColumn => {
            return mappings[rawColumn];
        });
    }

    setRawDataToValuesFromXml(xmlFields){
        xmlFields.forEach((obj) => {
            if (!obj.$ || !obj['_'] || !obj.$['xfdf:original']){
                return;
            }
            let rawFieldName = obj.$['xfdf:original'];
            let value = obj['_'];
            this.rawDataToValues[rawFieldName] = value;
        });
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

                    this.rawColumnOrdered.forEach(rawColumn => {
                        row.push(this.rawDataToValues[rawColumn] || '');
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

        if (this.mappedColumnOrdered.length != this.rawColumnOrdered.length){
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