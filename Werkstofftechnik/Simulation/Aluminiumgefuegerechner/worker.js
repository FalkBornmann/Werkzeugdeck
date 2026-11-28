import {run} from './model.js';
onmessage=event=>{try{postMessage({result:run(event.data)});}catch(error){postMessage({error:error.message});}};
