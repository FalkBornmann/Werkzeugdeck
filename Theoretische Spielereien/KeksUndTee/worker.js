import {simulate} from './model.js';
self.onmessage=e=>{try{self.postMessage({result:simulate(e.data,progress=>self.postMessage({progress}))});}catch(error){self.postMessage({error:error.message});}};
