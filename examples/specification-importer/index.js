/*! resol-vbus | Copyright (c) 2013-2014, Daniel Wippermann | MIT license */
'use strict';



var fs = require('fs');


var glob = require('glob');
var _ = require('lodash');
var Q = require('q');
var xml2js = require('xml2js');


var checkSpec = require('./checker');
var VBusSpecDeserializer = require('./deserializer');
var models = require('./models');
var generateVBusSpecificationData = require('./specification-data-generator');



/*
 * mkdir <tmpdir>
 * cd <tmpdir>
 * 7z x <RSC setup exe>
 * mkdir resol
 * cp -a \$_OUTDIR/plugins/de.resol* resol/
 * cd resol
 * for NAME in *.jar; do DIR="$(basename $NAME .jar)"; mkdir $DIR; (cd $DIR; 7z x ../$NAME); done
 * rm ./de.resol.servicecenter.vbus.cosmo_2.0.0/VBusSpecificationCosmoMulti.xml
 * find . -iname VBus*.xml
 * node .../specification-import/index.js
 */



var main = function() {
    return Q.fcall(function() {
        var rscExtractPath = process.argv [2] || '.';

        return Q.nfapply(glob, [ rscExtractPath + '/**/VBus*.xml' ]);
    }).then(function(filenames) {
        var promise = Q();

        var spec = new models.VBusSpecification();

        var deserializer = new VBusSpecDeserializer();

        _.forEach(filenames, function(filename) {
            promise = promise.then(function() {
                return Q.npost(fs, 'readFile', [ filename ]);
            }).then(function(content) {
                return Q.npost(xml2js, 'parseString', [ content ]);
            }).then(function(xmlRoot) {
                var specRoot = xmlRoot.vbusSpecification;

                if (specRoot) {
                    deserializer.deserializeVBusSpecification(specRoot, spec);
                } else {
                    throw new Error('Unknown root element');
                }
            });
        });

        return promise.then(function() {
            return spec;
        });
    }).then(function(spec) {
        return checkSpec(spec);
    }).then(function(spec) {
        return generateVBusSpecificationData(spec);
    }).then(function(output) {
        console.log(output);
    });
};



if (require.main === module) {
    Q.fcall(main).done();
} else {
    module.exports = main;
}
