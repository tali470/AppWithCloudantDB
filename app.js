/**
 * Module dependencies.
 */

var express = require('express'),
  http = require('http'),
  path = require('path'),
  fs = require('fs'),
  util = require('util')

var app = express()

var db

var cloudant

var fileToUpload

var dbCredentials = {
  dbName: 'my_sample_db'
}

var bodyParser = require('body-parser')
var methodOverride = require('method-override')
var logger = require('morgan')
var errorHandler = require('errorhandler')
var multipart = require('connect-multiparty')
var multipartMiddleware = multipart()

// all environments
app.set('port', process.env.PORT || 3000)
// app.set('views', __dirname + '/views')
app.set('view engine', 'ejs')

// app.engine('html', require('ejs').renderFile)
app.use(logger('dev'))
app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(bodyParser.json())
app.use(methodOverride())
app.use(express.static(path.join(__dirname, 'public')))
app.use('/style', express.static(path.join(__dirname, '/views/style')))

// development only
if (app.get('env') == 'development') {
  app.use(errorHandler())
}

function initDBConnection () {
    // When running on Bluemix, this variable will be set to a json object
    // containing all the service credentials of all the bound services
  if (process.env.VCAP_SERVICES) {
    var vcapServices = JSON.parse(process.env.VCAP_SERVICES)
        // Pattern match to find the first instance of a Cloudant service in
        // VCAP_SERVICES. If you know your service key, you can access the
        // service credentials directly by using the vcapServices object.
    for (var vcapService in vcapServices) {
      if (vcapService.match(/cloudant/i)) {
        dbCredentials.url = vcapServices[vcapService][0].credentials.url
      }
    }
  } else { // When running locally, the VCAP_SERVICES will not be set
        // When running this app locally you can get your Cloudant credentials
        // from Bluemix (VCAP_SERVICES in "cf env" output or the Environment
        // Variables section for an app in the Bluemix console dashboard).
        // Alternately you could point to a local database here instead of a
        // Bluemix service.
        // url will be in this format: https://username:password@xxxxxxxxx-bluemix.cloudant.com
    dbCredentials.url = 'https://0235a8bb-91d1-4515-a03a-908ee72546bb-bluemix:8e68c2968f19aa1c739e7cd59b930b707e8e9d17a15846a01c5ed6a8b46d8f34@0235a8bb-91d1-4515-a03a-908ee72546bb-bluemix.cloudant.com'
  }

  cloudant = require('cloudant')(dbCredentials.url)

    // check if DB exists if not create
  cloudant.db.create(dbCredentials.dbName, function (err, res) {
    if (err) {
      console.log('Could not create new db: ' + dbCredentials.dbName + ', it might already exist.')
    }
  })

  db = cloudant.use(dbCredentials.dbName)
}

initDBConnection()

app.get('/', function (req, res) {
  res.render('form')
})

app.post('/', function (req, res) {
  console.log('Create Invoked..')
  console.log('Name: ' + req.body.name)
  console.log('POST: ' + util.inspect(req.body, false, null))

    // var id = req.body.id;
  var name = req.body.name
  // var value = req.body.value
  var email = req.body.email
  var telephone = req.body.tel
  var location = req.body.select

  var formData = {
    name: name,
    email: email,
    telephone: telephone,
    location: location
  }

  saveDocument(null, formData)
  res.render('success')
})

app.get('/list', function (req, res) {
  getDocuments().then(function (docs) {
    res.render('list', {docs: docs})
  })
})

function createResponseData (id, name, value, attachments) {
  var responseData = {
    id: id,
    name: name,
    value: value,
    attachements: []
  }

  attachments.forEach(function (item, index) {
    var attachmentData = {
      content_type: item.type,
      key: item.key,
      url: '/api/favorites/attach?id=' + id + '&key=' + item.key
    }
    responseData.attachements.push(attachmentData)
  })
  return responseData
}

var saveDocument = function (id, formData) {
  if (id === undefined) {
        // Generated random id
    id = ''
  }

  console.log('trying to save document', util.inspect(formData, false, null))
  db.insert(formData, id, function (err, doc) {
    if (err) {
      console.log(err)
    }
  })
}

var getDocuments = function () {
  return new Promise(function (resolve, reject) {
    db = cloudant.use(dbCredentials.dbName)
    var docList = []
    db.list({include_docs: true}, function (err, body) {
      if (!err) {
        var len = body.rows.length
        console.log('total # of docs -> ' + len)
        body.rows.forEach(function (document) {
          docList.push(document.doc)
        })

        resolve(docList)
      } else {
        console.log(err)
      }
    })
  })
}

http.createServer(app).listen(app.get('port'), '0.0.0.0', function () {
  console.log('Express server listening on port ' + app.get('port'))
})
