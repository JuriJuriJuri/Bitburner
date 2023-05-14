import { Weight } from "functions.js";
import { Scan } from "functions.js";
import { List_servers } from "functions.js";
import { Target } from "functions.js";
import { GetAllServers } from "functions.js";
import { RunScript } from "functions.js";
import { Countdown } from "functions.js";

/** @param {NS} ns 
 * starts the process of opening servers, weaken, grow and hack.
*/






export async function main(ns) {
    const args = ns.flags([["help", false]]);
    if (args.help) {
        ns.tprint("This script starts the scripts on all servers on which you can run scripts.");
        ns.tprint(`Usage: run ${ns.getScriptName()}`);
        ns.tprint("Example:");
        ns.tprint(`> run ${ns.getScriptName()}`);
        return;
    }
    ns.exec("sesame.js", "home");
    // No point recalculating these in the loop, they are constant
    const hackRam = ns.getScriptRam("hack.js");
    const growRam = ns.getScriptRam("grow.js");
    const weakenRam = ns.getScriptRam("weaken.js");


    while (true) {
        let player = ns.getPlayer();
        while (player.skills.hacking < 2) {
            ns.exec("hack.js", "home", 20, "n00dles");
            await ns.sleep(ns.getHackTime("n00dles") + 40)
            player = ns.getPlayer();
        }

        //provides list of hackable servers
        let openservers = List_servers(ns).filter(s => ns.hasRootAccess(s)).concat(['home']);
        //provides a list of usable servers
        let usableservers = openservers.filter(server => ns.getServerMaxRam(server) != 0);

        // ranks hackable servers
        Weight();
        ns.tprint(Target(ns));
        // provides the target, 

        var target = Target(ns);
        const moneyThresh = ns.getServerMaxMoney(target);
        const securityThresh = ns.getServerMinSecurityLevel(target);
        const hackTime = ns.getHackTime(target);
        const growTime = ns.getGrowTime(target);
        const growstatistic = ns.getServerGrowth(target);
        //const groweffect = ns.formulas.hacking.growThreads(target);
        const weakenTime = ns.getWeakenTime(target);

        // Weaken thread calculation:
        const minSec = ns.getServerMinSecurityLevel(target);
        const sec = ns.getServerSecurityLevel(target);
        let weakenThreads = Math.ceil((sec - minSec) / ns.weakenAnalyze(1));
        // Hack thread calculation:
        let money = ns.getServerMoneyAvailable(target);
        if (money <= 0) money = 1; // division by zero safety
        let hackThreads = Math.ceil(ns.hackAnalyzeThreads(target, money / 2));
        // Grow thread calculation:
        let maxMoney = ns.getServerMaxMoney(target);
        let growThreads = Math.ceil(ns.growthAnalyze(target, maxMoney / money));


        //ns.tprint(`${weakenThreads} threads needed to achieve ${minSec} Security on ${target}`);
       // ns.tprint(`${growThreads} needed to grow ${target} ${ns.nFormat(money, "$0.000a")} to max money ${ns.nFormat(maxMoney, "$0.000a")} `);
       // ns.tprint(`${hackThreads} needed to hack ${target} take ${ns.nFormat(money, "$0.000a")}`);


        for (const server of usableservers) {
            // Maximum threads calculation
            let availableRam = (ns.getServerMaxRam(server) - ns.getServerUsedRam(server));
            if (availableRam <= 0) continue;

            if (ns.getServerSecurityLevel(target) > securityThresh) {
                // If the server's security level is above our threshold, weaken it
                let maxweakenthreads = Math.floor(availableRam / weakenRam);
                let serverweakenThreads = Math.min(maxweakenthreads, weakenThreads);
                if (serverweakenThreads <= 0) continue;
                await RunScript(ns, "weaken.js", server, target, serverweakenThreads);
                weakenThreads -= serverweakenThreads;

                if (weakenThreads <= 0) await Countdown(ns, weakenTime);
            }

            else if (ns.getServerMoneyAvailable(target) < moneyThresh) {
                // If the server's money is less than our threshold, grow it
                let maxgrowthreads = Math.floor(availableRam / growRam);
                let servergrowThreads = Math.min(maxgrowthreads, growThreads);
                if (servergrowThreads <= 0) continue;
                await RunScript(ns, "grow.js", server, target, servergrowThreads);
                growThreads -= servergrowThreads;

                if (growThreads <= 0) await Countdown(ns, growTime);
            }

            else {
                // Otherwise, hack it
                let maxhackthreads = Math.floor(availableRam / hackRam);
                let serverhackThreads = Math.min(maxhackthreads, hackThreads);
                if (serverhackThreads <= 0) continue;
                await RunScript(ns, "hack.js", server, target, serverhackThreads);
                hackThreads -= serverhackThreads;
                if (hackThreads < 1) await Countdown(ns, hackTime);
            }
        }
        await ns.sleep(1000)
    }
}