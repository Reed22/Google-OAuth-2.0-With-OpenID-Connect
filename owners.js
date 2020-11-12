const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');

const datastore = ds.datastore;

const BOAT = "Boat";

router.use(bodyParser.json());

//Get all boats owned by specific user
function get_boats(owner_id){
    var q = datastore.createQuery(BOAT);
    return datastore.runQuery(q).then( (entities) => {
        return entities[0].map(ds.fromDatastore).filter(boat => boat.owner == owner_id)
    })
}

router.get('/:owner_id/boats', function(req, res){
    get_boats(req.params.owner_id)
    .then(boats => {
      res.status(200).send(boats)
    })
});
module.exports = router;