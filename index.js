import init, * as oxigraph from "https://esm.sh/oxigraph@0.3.16/web.js";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

await init();

const {
  TURTLE_FILE_URL = "https://joinup.ec.europa.eu/sites/default/files/distribution/2013-11/cpsv_101.ttl",
  BASE_URI = "http://example.com/ex",
} = Deno.env.toObject();

async function fetchTurtleFile( file ) {
  //const response = await fetch(TURTLE_FILE_URL);
  const response = await Deno.readTextFile('demo4.txt')
  return await response;
}

async function createStore() {
  const turtleContent = await fetchTurtleFile();
  const defn = await fetch(TURTLE_FILE_URL)
  const store = new oxigraph.Store();
  store.load(turtleContent, "text/turtle", BASE_URI);
  store.load(defn, "text/turtle", BASE_URI)

  return store;
}

const store = await createStore();

async function executeQuery({ store, query }) {
  const response = {
    query,
    results: [],
  };

  if (!query) {
    response.error = "Empty or missing query parameter";
    return response;
  }

  if (!query.trimStart().toUpperCase().startsWith("SELECT ")) {
    response.error = "Only SELECT queries are supported";
    return response;
  }

  try {
    for (const binding of store.query(query)) {
      const result = {};
      binding.forEach((value, key) => {
        result[key] = value ? value.value : null;
      });
      response.results.push(result);
    }
  } catch (error) {
    response.error = error.message;
    if (Deno.env.get("ENV") === "development") {
      response.stack = error.stack;
    }
  }

  return response;
}

async function handleRequest(request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const query = params.get("query");
  var non_prefixed_query = query

  if (request.method === "GET") {

    console.log(query);
    const prefixi = query.match(/(PREFIX.*?>)/g,'');

    prefixi.forEach( function (prefi) {

      
      const pref = prefi.match(/(\s.*?\:)/)[0].trim()
      const iri = prefi.match(/(<.*?(?=>))/)[0].trim();
      console.log("replace ~",pref.substring(0, pref.length - 1), "~ with ", iri)
      # doesn't work but should do replacements of the prefixes
      const re = new RegExp(`${pref.substring(0, pref.length - 1)}`)
      console.log(non_prefixed_query.replace(re,  iri + ">"));
      non_prefixed_query = non_prefixed_query.replace("rdfsss:", "hello!");

    })

    
    const prefixes = "^PREFIX.*?(?=>)"

    const response = await executeQuery({ store, non_prefixed_query });


    const corsResponse = new Response(JSON.stringify(response, null, 2), {
      headers: {
        "Access-Control-Allow-Origin": "*", // Allow requests from any origin
        "Access-Control-Allow-Methods": "GET", // Allow only GET requests
        "Access-Control-Allow-Headers": "Content-Type", // Allow Content-Type header
      },
    });

    return corsResponse;
  }

  return new Response("Unsupported request method", { status: 405 });
}

serve(handleRequest);
