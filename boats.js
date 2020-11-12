const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const datastore = ds.datastore;

const BOAT = "Boat";

router.use(bodyParser.json());

const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://www.googleapis.com/oauth2/v3/certs`
    }),

    // Validate the audience and the issuer.
    issuer: `https://accounts.google.com`,
    algorithms: ['RS256'],
});

/*****************************************************************
 *                   API HELPER FUNCTIONS
*****************************************************************/
//Create boat
function post_boat(name, type, length, public, owner){
    var key = datastore.key([BOAT])
    const new_boat = {"name": name, "type": type, "length": length, "public": public, "owner": owner}
    return datastore.save({"key": key, "data": new_boat}).then(() => {return key})
}

//Get all boats w/ JWT
function get_boats(req){
    var q = datastore.createQuery(BOAT);
    return datastore.runQuery(q).then( (entities) => {
        return entities[0].map(ds.fromDatastore).filter(boat => boat.owner == req.user.sub)
    })
}

//Get all public boats
function get_public_boats(req){
    var q = datastore.createQuery(BOAT);
    return datastore.runQuery(q).then( (entities) => {
        return entities[0].map(ds.fromDatastore).filter(boat => boat.public == true)
    })
}

//Deletes boat and removes any loads
//Return 0 on success, -1 if user is not owner, 1 if boat id does not exist
async function delete_boat(id, user){
    const boat_key = datastore.key([BOAT, parseInt(id, 10)])
    let [boat] = await datastore.get(boat_key)
    //If boat exists
    if(boat){
        //User is owner of boat
        if(boat.owner == user)
            datastore.delete(boat_key)
        else
            return -1
        return 0
    }
    return 1
}
/*****************************************************************
 *                          ROUTE HANDLERS
*****************************************************************/
//Create a boat
router.post('/', checkJwt, async function(req, res, next){

    //console.log(req.user)
    post_boat(req.body.name, req.body.type, req.body.length, req.body.public, req.user.sub)
    .then( key => {
        let return_object = {
            "id": key.id,
            "name": req.body.name,
            "type": req.body.type,
            "length": req.body.length,
            "public": req.body.public,
            "owner": req.user.sub
        }
        res.status(201).json(return_object)
    })
  });

//Get all boats
router.get('/', checkJwt, function(req, res){
    get_boats(req)
    .then(boats => {
      res.status(200).send(boats)
    })
  });

//Delete Boat
router.delete('/:boat_id', checkJwt, function(req,res){
    delete_boat(req.params.boat_id, req.user.sub)
    .then(outcome => {
        if(outcome === 0)
            res.status(204).end()
        else if(outcome === 1)
            res.status(403).send({"Error": "No boat with this boat_id exists"})
        else if(outcome === -1)
            res.status(403).send({"Error": "You do not have permission to delete this boat."})
    })
});

router.use((err, req, res, next) => {  
    //console.log(req.method)
    if(req.method == 'GET'){
        get_public_boats(req)
        .then(boats => {
            res.status(200).send(boats)
        })
    }
    else if (err.name === 'UnauthorizedError') {   
        res.status(401).json({"error" : err.name + ": " + err.message})  
    }
})

module.exports = router;
