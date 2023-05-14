/** @param {NS} ns 
      this script contains all functions for other scripts
*/

// Returns a weight that can be used to sort servers by hack desirability
export function Weight(ns, server) {
    if (!server) return 0;
    // Don't ask, endgame stuff
    if (server.startsWith('hacknet-node')) return 0;
    // Get the player information
    let player = ns.getPlayer();
    // Get the server information
    let so = ns.getServer(server);
    // Set security to minimum on the server object (for Formula.exe functions)
    so.hackDifficulty = so.minDifficulty;
    // We cannot hack a server that has more than our hacking skill so these have no value
    if (so.requiredHackingSkill > player.skills.hacking) return 0;
    // Default pre-Formulas.exe weight. minDifficulty directly affects times, so it substitutes for min security times
    let weight = so.moneyMax / so.minDifficulty;
    // If we have formulas, we can refine the weight calculation
    if (ns.fileExists('Formulas.exe')) {
        if (ns.formulas.hacking.hackChance(so, player) < 0.5) return 0;
        else {
        // We use weakenTime instead of minDifficulty since we got access to it, 
        // and we add hackChance to the mix (pre-formulas.exe hack chance formula is based on current security, which is useless)
        weight = so.moneyMax / ns.formulas.hacking.weakenTime(so, player) * ns.formulas.hacking.hackChance(so, player);
        }
    }
    else
        // If we do not have formulas, we can't properly factor in hackchance, so we lower the hacking level tolerance by half
        if (so.requiredHackingSkill > player.skills.hacking / 2)
            return 0;
    return weight;
}
// this functions scans for servers and pushes each to a list
export function Scan(ns, parent, server, list) {
    const children = ns.scan(server);
    for (let child of children) {
        if (parent == child) {
            continue;
        }
        list.push(child);
        Scan(ns, server, child, list);
    }
}


//this function creates an array of servernames
export function List_servers(ns) {
    const list = [];
    Scan(ns, '', 'home', list);
    return list;
}

//another function providing a list of servers
export function GetAllServers(ns, root = "home", found = new Set()) {
    found.add(root);
    for (const server of ns.scan(root))
        if (!found.has(server)) GetAllServers(ns, server, found);
    return [...found];
}

//this function takes a list of servers and provides the most promising target based on weight
export function Target(ns) {
    let target = "";
    let targets = [];
    let openservers = List_servers(ns).filter(s => ns.hasRootAccess(s)).concat(['home']);
    for (const server of openservers) {
        if (server == "home") {
            continue
        }
        let weight = Weight(ns, server);
        let serv = [server, weight];
        if (weight != 0) {
            targets.push(serv)
        }
        targets.sort((a, b) => {
            return b[1] - a[1];
        })
        target = targets[0][0];
    }
    return target;
}

//this function runs a script 
export async function RunScript(ns, scriptName, server, target, threads) {

    // Find script RAM usage
    let ramPerThread = ns.getScriptRam(scriptName);
    // Find usable servers
    // Fired threads counter
    let fired = 0;
    // Determine how many threads we can run on target server for the given script
    let availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
    let possibleThreads = Math.floor(availableRam / ramPerThread);
    // Check if server is already at max capacity
    // Lower thread count if we are over target
    //if (possibleThreads > threads) {
    //    possibleThreads = threads
    //}

    // Copy script to the server
    if (server != "home") {
        await ns.scp(scriptName, server);
        // Fire the script with as many threads as possible
        await ns.tprint(`Starting script ${scriptName} on ${server} against ${target} with ${threads} threads`);
        await ns.exec(scriptName, server, threads, target);
        fired += possibleThreads;
    }
    return fired
}

//this is a sleeping countdown function that counts down a sleeping time
export async function Countdown(ns, timer) {

    for (let countdown = timer; countdown > 0; countdown -= 60000) {
        ns.tprint(`sleeping for ${ns.tFormat(countdown)} `)
        if (countdown > 60000) await ns.sleep(60000);
        else await ns.sleep(countdown);
    }
}



export async function main(ns) {
}