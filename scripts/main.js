// Tomares v1.11.5 - sectioned full-block research with drill overlay variants and lighter research refresh
var LANG_KEY = "tomares-lang";
var PREFIX = "tomares-up-";
var PARTIAL = "tomares-part-";
var SAVE_PREFIX = "tomares-save-v2-";
var SAVE_TAG_PREFIX = "tomares-upgrades-v2-";

var persistentLevels = {};
var persistentMissions = {};
var persistentPoints = 0;
var exclusiveUnlocked = {};
var EXCLUSIVE_UPGRADE_IDS = [];
var heatMapEnabled = false;
var prestigeBySector = {};
var persistentShop = null;
var persistentPointMissions = null;
var persistentPartial = {};
var activeStoreKey = null;
var activeTagKey = null;
var appliedMap = {};
var globalTransportTargets = {};
var lastSelected = null;
var selectedBuilds = [];
var pendingSelectBuild = null;
// Hold + drag area select (same block type)
var areaSelectActive = false;
var areaSelectHolding = false;
var areaSelectOriginBuild = null;
var areaSelectBlock = null;
var areaSelectStartX = 0;
var areaSelectStartY = 0;
var areaSelectEndX = 0;
var areaSelectEndY = 0;
var areaSelectHoldStart = -1;
var AREA_HOLD_TIME = 25; // ~0.4s at 60fps (Time.time units)


var pendingSelectTime = -999999;
var DOUBLE_TAP_WINDOW = 45; // slightly longer — mobile double-tap friendlier

var uiScrollCache = {};
var blockHasUpgradesCache = {};
function uiScrollGet(key){ try{ var v = uiScrollCache[key]; return v == null ? 0 : v; }catch(e){ return 0; } }
function uiScrollSet(key, y){ try{ uiScrollCache[key] = y; }catch(e){} }


var selectGraceUntil = -999999;

function sameTeamBuild(b){
    try{
        if(b == null || Vars.player == null) return false;
        if(!b.isValid()) return false;
        return b.team == Vars.player.team();
    }catch(e){ return false; }
}
function buildsEqual(a, b){
    try{
        if(a == null || b == null) return false;
        if(a === b || a == b) return true;
        if(a.tile != null && b.tile != null && a.tile.x === b.tile.x && a.tile.y === b.tile.y) return true;
    }catch(e){}
    return false;
}
function sameBlockType(a, b){
    try{
        if(a == null || b == null || a.block == null || b.block == null) return false;
        if(a.block == b.block || a.block === b.block) return true;
        return (""+a.block.name) === (""+b.block.name);
    }catch(e){ return false; }
}
function clearBuildSelection(){
    selectedBuilds = [];
    lastSelected = null;
    pendingSelectBuild = null;
    pendingSelectTime = -999999;
}
function pruneSelectedBuilds(){
    var out = [];
    for(var i = 0; i < selectedBuilds.length; i++){
        var b = selectedBuilds[i];
        if(sameTeamBuild(b)) out.push(b);
    }
    selectedBuilds = out;
    if(selectedBuilds.length > 0){
        var found = false;
        for(var j = 0; j < selectedBuilds.length; j++){
            if(buildsEqual(selectedBuilds[j], lastSelected)){ found = true; lastSelected = selectedBuilds[j]; break; }
        }
        if(!found) lastSelected = selectedBuilds[0];
    }else if(lastSelected != null && !sameTeamBuild(lastSelected)){
        lastSelected = null;
    }
}
function addToBuildSelection(build){
    if(build == null || !sameTeamBuild(build)) return;
    pruneSelectedBuilds();
    if(selectedBuilds.length > 0){
        if(!sameBlockType(selectedBuilds[0], build)){
            selectedBuilds = [build];
            lastSelected = build;
            return;
        }
    }
    for(var i = 0; i < selectedBuilds.length; i++){
        if(buildsEqual(selectedBuilds[i], build)){
            lastSelected = selectedBuilds[i];
            return;
        }
    }
    selectedBuilds.push(build);
    lastSelected = build;
}

function selectedSameTypeList(build){
    pruneSelectedBuilds();
    if(build == null) return [];
    if(selectedBuilds.length === 0) return [build];
    try{ if(selectedBuilds[0].block === build.block) return selectedBuilds.slice(); }catch(e){}
    return [build];
}
function scaleCostStacks(cost, mult){
    if(cost == null || mult <= 1) return cost || [];
    var out = [];
    for(var i = 0; i < cost.length; i++){
        var s = cost[i];
        if(s == null) continue;
        out.push([s[0], (s[1]|0) * mult]);
    }
    return out;
}
function countNeedingUpgrade(list, uid, targetLv){
    var n = 0;
    for(var i = 0; i < list.length; i++){
        var b = list[i];
        if(b == null) continue;
        if((getApplied(b, uid)|0) < targetLv) n++;
    }
    return n;
}
var selectTable = null;
var researchHudTable = null;
var selectCacheKey = null;
var HISTORY_KEY = "newtechs-history";
var HISTORY_MAX = 80;
var upgradeHistory = [];
var NET_PACKET = "newtechs";
var bulletBaseSnapshot = {};
var bulletCatalogBuilt = false;
var INSTALL_BAR_X = "tomares-install-bar-x";
var INSTALL_BAR_Y = "tomares-install-bar-y";
var masterActivationKey = null;
var masterAppliedTeamId = -1;
var masterBaseState = {};
var FAVORITES_KEY = "newtechs-favorites";
var DAILY_BONUS_KEY = "newtechs-daily-bonus";
var favoriteBlocks = {};
var installFlashBuilds = [];
var SPEC_KEY = "newtechs-spec-path";
var specializationPath = null;
var activeContracts = null;
var CONTRACT_KEY = "newtechs-contracts";



// Ammo extra system removed (did not work reliably). Stubs keep old saves from crashing.
function javaAmmoTurretClass(){ return null; }
function attachNewTechAmmoTurret(block){ return null; }
var NewTechAmmo = {
    reset: function(){},
    register: function(){ return null; },
    unlock: function(){ return false; },
    refreshAll: function(){ return 0; },
    refreshUpgrade: function(){},
    validate: function(){ return true; },
    capture: function(){ return null; },
    entryKey: function(){ return ""; }
};
function activateResearchedAmmo(){ return 0; }
function buildAmmoCatalog(){}
function addAmmoGroupForTurret(){}
function markAmmoItemAccepted(){}
function ammoCandidateItems(){ return []; }
function ammoRoleForItem(){ return "standard"; }
function cloneAmmoBullet(){ return null; }
function chooseAmmoSourceItem(){ return null; }
function ammoUpgradeId(){ return ""; }
function addUsefulAmmoGlobal(){ return false; }



// ---- NT transport: NEW block classes (imitation of vanilla, own Build class) ----
// Sprites are taken from vanilla in load()/ClientLoad — without that you only see a shadow.

function ntTransportTimeScale(build){
    try{
        if(build == null || build.block == null) return 1;
        var name = "" + build.block.name;
        if(name.indexOf("newtech-nt-") === 0) name = name.substring("newtech-nt-".length);
        if(Vars.player == null || build.team !== Vars.player.team()) return 1;
        var f = globalFactorByBlock[name];
        if(f == null || f <= 0) return 1;
        return 1 + f;
    }catch(e){ return 1; }
}

function ntCopyVisuals(dst, src){
    // Conveyors draw with regions[blend][frame] loaded as name-0-0 .. name-6-3
    // Copying only region leaves a SHADOW. Must copy the full regions grid.
    if(dst == null || src == null) return false;
    var ok = false;
    try{
        var vname = "" + src.name;
        // Prefer sharing the exact region arrays from vanilla (same atlas UVs)
        try{
            if(src.regions != null){
                dst.regions = src.regions;
                ok = true;
            }
        }catch(eR){}
        // Fallback: load by vanilla atlas keys conveyor-0-0 etc.
        if(!ok){
            try{
                var grid = [];
                var found = 0;
                for(var i = 0; i < 7; i++){
                    grid[i] = [];
                    for(var j = 0; j < 4; j++){
                        var reg = Core.atlas.find(vname + "-" + i + "-" + j);
                        grid[i][j] = reg;
                        if(reg != null && reg.found && reg.found()) found++;
                    }
                }
                if(found > 0){
                    dst.regions = grid;
                    ok = true;
                }
            }catch(eG){}
        }
        // Conduit-style multi regions
        try{ if(src.topRegions != null){ dst.topRegions = src.topRegions; ok = true; } }catch(eT){}
        try{ if(src.botRegions != null){ dst.botRegions = src.botRegions; ok = true; } }catch(eB){}
        try{ if(src.capRegion != null){ dst.capRegion = src.capRegion; ok = true; } }catch(eC){}
        try{ if(src.rotateRegions != null){ dst.rotateRegions = src.rotateRegions; ok = true; } }catch(eRR){}
        // Generic
        try{ if(src.region != null){ dst.region = src.region; ok = true; } }catch(e1){}
        try{ if(src.uiIcon != null) dst.uiIcon = src.uiIcon; }catch(e2){}
        try{ if(src.fullIcon != null) dst.fullIcon = src.fullIcon; }catch(e3){}
        try{ if(src.teamRegion != null) dst.teamRegion = src.teamRegion; }catch(e4){}
        try{ if(src.drawer != null) dst.drawer = src.drawer; }catch(e5){}
        // Icons from regions if missing
        try{
            if((dst.uiIcon == null || (dst.uiIcon.found && !dst.uiIcon.found())) && src.regions != null && src.regions[0] != null){
                dst.uiIcon = src.regions[0][0];
                dst.fullIcon = src.regions[0][0];
                dst.region = src.regions[0][0];
            }
        }catch(e6){}
        return ok;
    }catch(e){ return false; }
}

function ntVisualReady(block){
    try{
        if(block == null) return false;
        // Conveyor path
        if(block.regions != null && block.regions[0] != null && block.regions[0][0] != null){
            var r = block.regions[0][0];
            if(r.found && r.found()) return true;
            if(r.width > 1) return true;
        }
        // Conduit path
        if(block.topRegions != null && block.topRegions[0] != null) return true;
        if(block.region != null){
            if(block.region.found && block.region.found()) return true;
            if(block.region.width > 1) return true;
        }
        return false;
    }catch(e){ return false; }
}

// Attach upgrade logic to VANILLA build class (keeps sprites 100%).
// This is the reliable path — no tile swap needed for throughput.
function ntAttachVanillaBuildLogic(vanilla, vanillaName){
    if(vanilla == null || vanilla.__ntVanillaLogic) return;
    vanilla.__ntVanillaLogic = true;
    var vname = "" + vanillaName;
    try{
        var prev = vanilla.buildType;
        if(prev == null) return;
        // Detect build class from a temporary instance if possible
        var sample = null;
        try{ sample = prev.get(); }catch(eS){}
        var BuildClass = null;
        try{ if(sample != null) BuildClass = sample.getClass(); }catch(eC){}
        if(BuildClass == null){
            // Fallbacks by type
            try{
                if(typeof Conveyor !== "undefined" && vanilla instanceof Conveyor) BuildClass = Conveyor.ConveyorBuild;
            }catch(e1){}
            try{
                if(BuildClass == null && typeof Conduit !== "undefined" && vanilla instanceof Conduit) BuildClass = Conduit.ConduitBuild;
            }catch(e2){}
            try{
                if(BuildClass == null && typeof Duct !== "undefined" && vanilla instanceof Duct) BuildClass = Duct.DuctBuild;
            }catch(e3){}
        }
        if(BuildClass == null) return;
        vanilla.buildType = function(){
            return extend(BuildClass, {
                updateTile: function(){
                    try{
                        if(Vars.player != null && this.team === Vars.player.team()){
                            var f = globalFactorByBlock[vname];
                            if(f != null && f > 0){
                                this.timeScale = 1 + f;
                                this.timeScaleDuration = 90;
                            }
                        }
                    }catch(eU){}
                    this.super$updateTile();
                }
            });
        };
    }catch(e){
        try{ Log.warn("New Tech's vanilla build logic attach failed for " + vname + ": " + e); }catch(e2){}
    }
}


function ntAttachBuild(block, BuildClass){
    if(block == null || BuildClass == null) return block;
    try{
        block.buildType = function(){
            return extend(BuildClass, {
                updateTile: function(){
                    try{
                        var ts = ntTransportTimeScale(this);
                        if(ts > 1.001){
                            this.timeScale = ts;
                            this.timeScaleDuration = 90;
                        }
                    }catch(eU){}
                    this.super$updateTile();
                }
            });
        };
    }catch(e){
        try{ Log.warn("New Tech's NT buildType attach failed: " + e); }catch(e2){}
    }
    return block;
}

function ntMake(superClass, name, BuildClass, vanillaName){
    if(superClass == null) return null;
    var b = null;
    try{
        b = extend(superClass, name, {
            load: function(){
                this.super$load();
                try{
                    var v = Vars.content.block(vanillaName);
                    if(v != null) ntCopyVisuals(this, v);
                }catch(eL){}
            }
        });
    }catch(e){
        try{ Log.warn("New Tech's NT extend failed for " + name + ": " + e); }catch(e2){}
        return null;
    }
    if(b == null) return null;
    if(BuildClass != null) ntAttachBuild(b, BuildClass);
    return b;
}

var NT_BLOCK_conveyor = ntMake(typeof Conveyor !== "undefined" ? Conveyor : null, "newtech-nt-conveyor", typeof Conveyor !== "undefined" ? Conveyor.ConveyorBuild : null, "conveyor");
var NT_BLOCK_titanium_conveyor = ntMake(typeof Conveyor !== "undefined" ? Conveyor : null, "newtech-nt-titanium-conveyor", typeof Conveyor !== "undefined" ? Conveyor.ConveyorBuild : null, "titanium-conveyor");
var NT_BLOCK_plastanium_conveyor = ntMake(typeof StackConveyor !== "undefined" ? StackConveyor : (typeof Conveyor !== "undefined" ? Conveyor : null), "newtech-nt-plastanium-conveyor", typeof StackConveyor !== "undefined" ? StackConveyor.StackConveyorBuild : (typeof Conveyor !== "undefined" ? Conveyor.ConveyorBuild : null), "plastanium-conveyor");
var NT_BLOCK_armored_conveyor = ntMake(typeof ArmoredConveyor !== "undefined" ? ArmoredConveyor : (typeof Conveyor !== "undefined" ? Conveyor : null), "newtech-nt-armored-conveyor", typeof ArmoredConveyor !== "undefined" ? ArmoredConveyor.ArmoredConveyorBuild : (typeof Conveyor !== "undefined" ? Conveyor.ConveyorBuild : null), "armored-conveyor");
var NT_BLOCK_junction = ntMake(typeof Junction !== "undefined" ? Junction : null, "newtech-nt-junction", typeof Junction !== "undefined" ? Junction.JunctionBuild : null, "junction");
var NT_BLOCK_router = ntMake(typeof Router !== "undefined" ? Router : null, "newtech-nt-router", typeof Router !== "undefined" ? Router.RouterBuild : null, "router");
var NT_BLOCK_distributor = ntMake(typeof Router !== "undefined" ? Router : null, "newtech-nt-distributor", typeof Router !== "undefined" ? Router.RouterBuild : null, "distributor");
var NT_BLOCK_sorter = ntMake(typeof Sorter !== "undefined" ? Sorter : null, "newtech-nt-sorter", typeof Sorter !== "undefined" ? Sorter.SorterBuild : null, "sorter");
var NT_BLOCK_inverted_sorter = ntMake(typeof Sorter !== "undefined" ? Sorter : null, "newtech-nt-inverted-sorter", typeof Sorter !== "undefined" ? Sorter.SorterBuild : null, "inverted-sorter");
var NT_BLOCK_overflow_gate = ntMake(typeof OverflowGate !== "undefined" ? OverflowGate : null, "newtech-nt-overflow-gate", typeof OverflowGate !== "undefined" ? OverflowGate.OverflowGateBuild : null, "overflow-gate");
var NT_BLOCK_underflow_gate = ntMake(typeof OverflowGate !== "undefined" ? OverflowGate : null, "newtech-nt-underflow-gate", typeof OverflowGate !== "undefined" ? OverflowGate.OverflowGateBuild : null, "underflow-gate");
var NT_BLOCK_item_bridge = ntMake(typeof BufferedItemBridge !== "undefined" ? BufferedItemBridge : (typeof ItemBridge !== "undefined" ? ItemBridge : null), "newtech-nt-item-bridge", typeof BufferedItemBridge !== "undefined" ? BufferedItemBridge.BufferedItemBridgeBuild : (typeof ItemBridge !== "undefined" ? ItemBridge.ItemBridgeBuild : null), "item-bridge");
var NT_BLOCK_phase_conveyor = ntMake(typeof ItemBridge !== "undefined" ? ItemBridge : null, "newtech-nt-phase-conveyor", typeof ItemBridge !== "undefined" ? ItemBridge.ItemBridgeBuild : null, "phase-conveyor");
var NT_BLOCK_mass_driver = ntMake(typeof MassDriver !== "undefined" ? MassDriver : null, "newtech-nt-mass-driver", typeof MassDriver !== "undefined" ? MassDriver.MassDriverBuild : null, "mass-driver");
var NT_BLOCK_conduit = ntMake(typeof Conduit !== "undefined" ? Conduit : null, "newtech-nt-conduit", typeof Conduit !== "undefined" ? Conduit.ConduitBuild : null, "conduit");
var NT_BLOCK_pulse_conduit = ntMake(typeof Conduit !== "undefined" ? Conduit : null, "newtech-nt-pulse-conduit", typeof Conduit !== "undefined" ? Conduit.ConduitBuild : null, "pulse-conduit");
var NT_BLOCK_plated_conduit = ntMake(typeof Conduit !== "undefined" ? Conduit : null, "newtech-nt-plated-conduit", typeof Conduit !== "undefined" ? Conduit.ConduitBuild : null, "plated-conduit");
var NT_BLOCK_bridge_conduit = ntMake(typeof LiquidBridge !== "undefined" ? LiquidBridge : null, "newtech-nt-bridge-conduit", typeof LiquidBridge !== "undefined" ? LiquidBridge.LiquidBridgeBuild : null, "bridge-conduit");
var NT_BLOCK_phase_conduit = ntMake(typeof LiquidBridge !== "undefined" ? LiquidBridge : null, "newtech-nt-phase-conduit", typeof LiquidBridge !== "undefined" ? LiquidBridge.LiquidBridgeBuild : null, "phase-conduit");
var NT_BLOCK_liquid_router = ntMake(typeof LiquidRouter !== "undefined" ? LiquidRouter : null, "newtech-nt-liquid-router", typeof LiquidRouter !== "undefined" ? LiquidRouter.LiquidRouterBuild : null, "liquid-router");
var NT_BLOCK_liquid_container = ntMake(typeof LiquidRouter !== "undefined" ? LiquidRouter : null, "newtech-nt-liquid-container", typeof LiquidRouter !== "undefined" ? LiquidRouter.LiquidRouterBuild : null, "liquid-container");
var NT_BLOCK_liquid_tank = ntMake(typeof LiquidRouter !== "undefined" ? LiquidRouter : null, "newtech-nt-liquid-tank", typeof LiquidRouter !== "undefined" ? LiquidRouter.LiquidRouterBuild : null, "liquid-tank");
var NT_BLOCK_duct = ntMake(typeof Duct !== "undefined" ? Duct : null, "newtech-nt-duct", typeof Duct !== "undefined" ? Duct.DuctBuild : null, "duct");
var NT_BLOCK_armored_duct = ntMake(typeof Duct !== "undefined" ? Duct : null, "newtech-nt-armored-duct", typeof Duct !== "undefined" ? Duct.DuctBuild : null, "armored-duct");
var NT_BLOCK_duct_router = ntMake(typeof DuctRouter !== "undefined" ? DuctRouter : null, "newtech-nt-duct-router", typeof DuctRouter !== "undefined" ? DuctRouter.DuctRouterBuild : null, "duct-router");
var NT_BLOCK_duct_bridge = ntMake(typeof DuctBridge !== "undefined" ? DuctBridge : null, "newtech-nt-duct-bridge", typeof DuctBridge !== "undefined" ? DuctBridge.DuctBridgeBuild : null, "duct-bridge");
var NT_BLOCK_duct_unloader = ntMake(typeof DirectionalUnloader !== "undefined" ? DirectionalUnloader : null, "newtech-nt-duct-unloader", typeof DirectionalUnloader !== "undefined" ? DirectionalUnloader.DirectionalUnloaderBuild : null, "duct-unloader");
var NT_BLOCK_reinforced_conduit = ntMake(typeof Conduit !== "undefined" ? Conduit : null, "newtech-nt-reinforced-conduit", typeof Conduit !== "undefined" ? Conduit.ConduitBuild : null, "reinforced-conduit");
var NT_BLOCK_reinforced_liquid_router = ntMake(typeof LiquidRouter !== "undefined" ? LiquidRouter : null, "newtech-nt-reinforced-liquid-router", typeof LiquidRouter !== "undefined" ? LiquidRouter.LiquidRouterBuild : null, "reinforced-liquid-router");
var NT_BLOCK_reinforced_liquid_container = ntMake(typeof LiquidRouter !== "undefined" ? LiquidRouter : null, "newtech-nt-reinforced-liquid-container", typeof LiquidRouter !== "undefined" ? LiquidRouter.LiquidRouterBuild : null, "reinforced-liquid-container");
var NT_BLOCK_reinforced_liquid_tank = ntMake(typeof LiquidRouter !== "undefined" ? LiquidRouter : null, "newtech-nt-reinforced-liquid-tank", typeof LiquidRouter !== "undefined" ? LiquidRouter.LiquidRouterBuild : null, "reinforced-liquid-tank");
var NT_BLOCK_reinforced_bridge_conduit = ntMake(typeof LiquidBridge !== "undefined" ? LiquidBridge : null, "newtech-nt-reinforced-bridge-conduit", typeof LiquidBridge !== "undefined" ? LiquidBridge.LiquidBridgeBuild : null, "reinforced-bridge-conduit");





function tryResearchNow(u){
    if(u == null) return false;
    var lv = levelOf(u.id);
    if(lv >= u.max) return true;
    if(!canResearchUpgrade(u)){
        try{
            if(u.tier === "ultimate") quietInfo(tr("Need COMBO first (3+ ranks on this block).", "Precisa de COMBO antes (3+ ranks neste bloco)."));
            else if(u.tier === "final") quietInfo(tr("Need ULTIMATE researched first.", "Precisa pesquisar ULTIMATE antes."));
        }catch(eG){}
        return false;
    }
    var cores = researchCores();
    // Sandbox: no cores / no items needed
    if(isSandbox()){
        setLevel(u.id, lv + 1);
        clearPartial(u.id);
        try{ bumpPointMission("research_any", 1); }catch(eM0){}
        try{
            var b0 = u.block != null ? u.block() : null;
            if(b0 != null && (""+b0.name) === "duo"){
                Core.app.post(function(){ try{ applyDuoAmmoRank(Math.max(duoResearchRank(), 1)); }catch(e){} });
            }
        }catch(eDuo0){}
        return true;
    }
    if(cores.length === 0) return false;
    var rem = remainingCost(u);
    var ok = false;
    if(rem.length === 0){
        setLevel(u.id, lv + 1);
        clearPartial(u.id);
        ok = true;
    }else if(canFull(cores, rem)){
        payStacks(cores, rem);
        setLevel(u.id, lv + 1);
        clearPartial(u.id);
        ok = true;
    }else if(hasAny(cores, rem)){
        ok = contributeResearch(u);
    }
    if(ok){
        try{ bumpPointMission("research_any", 1); }catch(eM){}
        try{
            var b = u.block != null ? u.block() : null;
            if(b != null){
                var g = BLOCK_GROUPS[""+b.name];
                if(g != null) ensureComboMastery(g);
            }
        }catch(eC){}
    }
    return ok;
}

function lang(){ return Core.settings.getString(LANG_KEY, "en"); }
// en, pt, es, vi — missing langs fall back to English
function tr(en, pt, es, vi){
    var l = lang();
    if(l === "pt" && pt != null && pt !== "") return pt;
    if(l === "es" && es != null && es !== "") return es;
    if(l === "vi" && vi != null && vi !== "") return vi;
    // soft fallbacks
    if(l === "es" && pt != null && pt !== "") return pt;
    return en;
}
function L(map){
    // map: {en, pt, es, vi}
    if(map == null) return "";
    return tr(map.en || "", map.pt || map.en || "", map.es || map.en || "", map.vi || map.en || "");
}
function isCampaign(){ return Vars.state != null && Vars.state.isCampaign(); }
function isPvp(){
    try{ return Vars.state != null && Vars.state.rules != null && Vars.state.rules.pvp; }catch(e){ return false; }
}
function isSandbox(){
    try{
        if(Vars.state == null || Vars.state.rules == null) return false;
        var r = Vars.state.rules;
        if(r.infiniteResources) return true;
        try{ if(r.editor) return true; }catch(eE){}
        try{ if(Vars.state.isEditor && Vars.state.isEditor()) return true; }catch(eE2){}
        return false;
    }catch(e){ return false; }
}

function unlockAllNewTechs(){
    try{
        ensureCatalogBuilt();
        ensurePersistentState();
        var n = 0;
        // Batch write — do NOT call setLevel per upgrade (too many saves / posts = crash on mobile)
        for(var id in UPGRADES){
            try{
                if(!UPGRADES.hasOwnProperty(id)) continue;
                var u = UPGRADES[id];
                if(u == null) continue;
                var mx = u.max != null ? u.max : (u.maxLevel != null ? u.maxLevel : 1);
                if(mx < 1) mx = 1;
                persistentLevels[id] = mx|0;
                n++;
            }catch(eOne){}
        }
        try{
            for(var mid in MASTER_UPGRADES){
                if(!MASTER_UPGRADES.hasOwnProperty(mid)) continue;
                var mu = MASTER_UPGRADES[mid];
                if(mu == null) continue;
                var mx2 = mu.max != null ? mu.max : (mu.maxLevel != null ? mu.maxLevel : 1);
                if(mx2 < 1) mx2 = 1;
                persistentLevels[mid] = mx2|0;
                n++;
            }
        }catch(eM){}
        try{ savePersistentState(true); }catch(eS){}
        // Heavy work deferred to next frames
        try{
            Core.app.post(function(){
                try{ refreshGlobalBoostRanks(); }catch(eR){}
                try{ applyAllBulletUpgrades(); }catch(eB){}
            });
        }catch(eP){
            try{ refreshGlobalBoostRanks(); }catch(eR2){}
        }
        quietInfo(tr("Unlocked all upgrades (", "Desbloqueou todas as melhorias (") + n + ")");
        return n;
    }catch(e){
        try{ quietInfo(tr("Unlock failed: ", "Falha ao desbloquear: ") + e); }catch(e2){}
        return 0;
    }
}


function isEditorMode(){
    try{ return Vars.state != null && Vars.state.rules != null && Vars.state.rules.editor; }catch(e){ return false; }
}
function isWorldAuthority(){
    try{
        if(Vars.net == null || !Vars.net.active()) return true;
        if(Vars.net.server()) return true;
        return false;
    }catch(e){ return true; }
}
function shopUsesHostRelay(){
    try{
        if(isWorldAuthority()) return false;
        return Vars.net != null && Vars.net.client();
    }catch(e){ return false; }
}

/** Default ON: any player can buy. Host can disable in New Tech's Options. */

function safeGetBool(key, def){
    try{
        if(Core.settings == null) return !!def;
        if(!Core.settings.has(key)) return !!def;
        // Avoid getBool — on Android a wrong type yields null Boolean → NPE on unbox
        var v = null;
        try{ v = Core.settings.get(key, null); }catch(eG){}
        if(v == null){
            try{
                var s = Core.settings.getString(key, def ? "true" : "false");
                if(s == null) return !!def;
                s = (""+s).toLowerCase();
                return s === "true" || s === "1" || s === "yes" || s === "on";
            }catch(eS){ return !!def; }
        }
        if(typeof v === "boolean") return v;
        if(typeof v === "number") return v !== 0;
        var sv = (""+v).toLowerCase();
        return sv === "true" || sv === "1" || sv === "yes" || sv === "on";
    }catch(e){ return !!def; }
}
function safePutBool(key, val){
    try{ Core.settings.put(key, val ? "true" : "false"); }catch(e){}
}

function shopClientsAllowed(){
    try{
        if(Vars.state != null && Vars.state.rules != null && Vars.state.rules.tags != null){
            var tag = Vars.state.rules.tags.get("newtechs-shop-clients");
            if(tag != null){
                var s = (""+tag).toLowerCase();
                if(s === "0" || s === "false" || s === "off" || s === "no") return false;
                if(s === "1" || s === "true" || s === "on" || s === "yes") return true;
            }
        }
    }catch(e0){}
    try{ return safeGetBool("newtechs-shop-allow-clients", true); }catch(e1){}
    return true;
}
function setShopClientsAllowed(allowed){
    allowed = !!allowed;
    try{ safePutBool("newtechs-shop-allow-clients", allowed); }catch(e){}
    try{
        if(Vars.state != null && Vars.state.rules != null && Vars.state.rules.tags != null){
            Vars.state.rules.tags.put("newtechs-shop-clients", allowed ? "1" : "0");
        }
    }catch(e2){}
}

function modeAllowsFreeShopUi(){
    return isPvp() || isSandbox() || isEditorMode();
}

function safePart(s){
    if(s == null) return "unknown";
    return (""+s).toLowerCase().replace(/[^a-z0-9_-]+/g, "_").substring(0, 90);
}
function blockSeed(name){
    var s = 0, str = "" + name;
    for(var i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(s);
}
function rangeCount(seed, min, max){
    return min + (seed % (max - min + 1));
}

function currentTeamId(){
    try{
        if(Vars.player != null){
            var t = Vars.player.team();
            if(t != null) return t.id|0;
        }
    }catch(e){}
    try{
        if(Vars.state != null && Vars.state.rules != null && Vars.state.rules.defaultTeam != null){
            return Vars.state.rules.defaultTeam.id|0;
        }
    }catch(e2){}
    return 1;
}

function mapIdentity(){
    try{
        var m = Vars.state.map;
        if(m != null){
            if(m.file != null){
                try{ return "file-" + m.file.nameWithoutExtension(); }catch(e){}
            }
            try{
                if(m.name != null){
                    if(typeof m.name === "function") return "name-" + m.name();
                    return "name-" + m.name;
                }
            }catch(e2){}
            try{ return "map-" + m.toString(); }catch(e3){}
        }
    }catch(e4){}
    return "unknown-map";
}

function campaignIdentity(){
    try{
        if(Vars.state != null && Vars.state.getPlanet != null){
            var p = Vars.state.getPlanet();
            if(p != null){
                if(p.name != null) return "planet-" + p.name;
                try{ return "planet-" + p.localizedName; }catch(e){}
            }
        }
    }catch(e2){}
    try{
        if(Vars.state != null && Vars.state.rules != null && Vars.state.rules.planet != null){
            var rp = Vars.state.rules.planet;
            if(rp.name != null) return "planet-" + rp.name;
            try{ return "planet-" + rp.localizedName; }catch(e3){}
        }
    }catch(e4){}
    return "campaign";
}

function modeIdentity(){
    try{
        var r = Vars.state.rules;
        var mode = r.pvp ? "pvp" : (r.editor ? "editor" : (r.attackMode ? "attack" : (r.infiniteResources ? "sandbox" : "survival")));
        var custom = r.modeName == null ? "" : ("-" + r.modeName);
        return mode + custom;
    }catch(e){ return "custom"; }
}

function saveSessionId(){
    // Stable id for this save (not map name). Survives re-enter of the same save.
    try{
        if(Vars.state == null || Vars.state.rules == null || Vars.state.rules.tags == null) return "nosave";
        var tags = Vars.state.rules.tags;
        var id = null;
        try{ id = tags.get("newtechs-save-id", null); }catch(e0){ id = tags.get("newtechs-save-id"); }
        if(id == null || (""+id).length === 0){
            id = "s" + (Time.millis()|0) + "-" + ((Math.random()*1e9)|0);
            try{ tags.put("newtechs-save-id", ""+id); }catch(e1){}
        }
        return ""+id;
    }catch(e){ return "nosave"; }
}

function stateStoreKey(){
    if(Vars.state == null || !Vars.state.isGame()) return null;
    var team = currentTeamId();
    if(isCampaign()) return SAVE_PREFIX + "campaign-" + safePart(campaignIdentity()) + "-team-" + team;
    // Custom / PvP: per save file + team (not per map name)
    return SAVE_PREFIX + "save-" + safePart(saveSessionId()) + "-team-" + team;
}

function stateTagKey(){
    if(Vars.state == null || Vars.state.rules == null) return null;
    var team = currentTeamId();
    if(isCampaign()) return SAVE_TAG_PREFIX + "campaign-team-" + team;
    return SAVE_TAG_PREFIX + "custom-team-" + team;
}

function parseStore(text){
    if(text == null || (""+text).length === 0) return null;
    try{
        var data = JSON.parse(""+text);
        if(data == null || typeof data !== "object") return null;
        if(data.levels == null) data.levels = {};
        if(data.partial == null) data.partial = {};
        if(data.missions == null) data.missions = {};
        if(data.points == null) data.points = 0;
        if(data.shop == null) data.shop = null;
        if(data.pointMissions == null) data.pointMissions = null;
        return data;
    }catch(e){ return null; }
}

function loadLegacyCampaignStore(){
    var data = {levels:{}, partial:{}};
    var found = false;
    var ids = Object.keys(UPGRADES);
    for(var i = 0; i < ids.length; i++){
        var id = ids[i];
        var lv = Core.settings.getInt(PREFIX + id, 0);
        if(lv > 0){ data.levels[id] = lv; found = true; }
        var ps = Core.settings.getString(PARTIAL + id, "");
        if(ps){
            try{ data.partial[id] = JSON.parse(ps); found = true; }catch(e){}
        }
    }
    return found ? data : null;
}

function loadPersistentState(){
    var key = stateStoreKey();
    if(key == null){
        activeStoreKey = null;
        activeTagKey = null;
        persistentLevels = {};
        persistentPartial = {};
        persistentMissions = {};
        persistentPoints = 0;
        persistentShop = null;
        persistentPointMissions = null;
        return;
    }
    var tagKey = stateTagKey();
    if(activeStoreKey === key && activeTagKey === tagKey) return;

    var data = null;
    var tagData = null;
    try{
        var tags = Vars.state.rules.tags;
        if(tags != null && tagKey != null){
            tagData = parseStore(tags.get(tagKey));
        }
    }catch(e){}

    // Campaign research is persistent for the planet/team, so prefer the local campaign store
    // and only use save tags as an additional source. Custom games prefer the save tag itself.
    if(isCampaign()){
        data = parseStore(Core.settings.getString(key, ""));
        if(data == null) data = loadLegacyCampaignStore();
        if(data == null) data = {levels:{}, partial:{}};
        if(tagData != null){
            var tagIds = Object.keys(tagData.levels || {});
            for(var ti = 0; ti < tagIds.length; ti++){
                var tid = tagIds[ti];
                var tv = tagData.levels[tid]|0;
                if((data.levels[tid]|0) < tv) data.levels[tid] = tv;
            }
            if(tagData.partial != null){
                var tagParts = Object.keys(tagData.partial);
                for(var tp = 0; tp < tagParts.length; tp++){
                    var tpid = tagParts[tp];
                    if(data.partial[tpid] == null) data.partial[tpid] = tagData.partial[tpid];
                }
            }
        }
    }else{
        data = tagData;
        if(data == null) data = parseStore(Core.settings.getString(key, ""));
        if(data == null) data = {levels:{}, partial:{}};
    }

    activeStoreKey = key;
    activeTagKey = tagKey;
    persistentLevels = data.levels;
            if(data.missions != null) persistentMissions = data.missions; else persistentMissions = {};
            if(data.points != null) persistentPoints = data.points|0;
            if(data.shop !== undefined) persistentShop = data.shop;
            if(data.pointMissions !== undefined) persistentPointMissions = data.pointMissions || {};
            if(data.exclusive != null) exclusiveUnlocked = data.exclusive;
            else exclusiveUnlocked = exclusiveUnlocked || {};
            if(data.prestige != null) prestigeBySector = data.prestige;
            else prestigeBySector = prestigeBySector || {};
            // Clamp broken infinite-star saves (legacy bug: star every setLevel)
            try{
                var pk = Object.keys(prestigeBySector || {});
                for(var pi = 0; pi < pk.length; pi++){
                    var pp = prestigeBySector[pk[pi]];
                    if(pp == null) continue;
                    if((pp.stars|0) > 20) pp.stars = 20;
                    if(pp.granted == null || typeof pp.granted !== "object") pp.granted = {};
                    if((pp.mine|0) > 5) pp.mine = 5;
                    if((pp.research|0) > 5) pp.research = 5;
                    if((pp.power|0) > 5) pp.power = 5;
                }
            }catch(eClamp){}
    persistentPartial = data.partial || {};

    // Keep the current save/settings copy synchronized after loading.
    savePersistentState(false);
}

function savePersistentState(flush){
    if(activeStoreKey == null) return;
    // Lean payload — shop stock / appliedMap never go here (campaign save errors)
    var data = JSON.stringify({
        version:3,
        levels:persistentLevels,
        partial:persistentPartial,
        missions:persistentMissions||{},
        points:persistentPoints|0,
        shop:null,
        pointMissions:persistentPointMissions,
        exclusive:exclusiveUnlocked||{},
        prestige:prestigeBySector||{}
    });
    try{ Core.settings.put(activeStoreKey, data); }catch(e){}
    // rules.tags: throttle hard — changing tags every research breaks campaign autosave + causes lag for all
    try{
        var now = Time.millis();
        if(typeof _lastTagWriteMs === "undefined") _lastTagWriteMs = 0;
        var shouldTag = !!flush || (now - _lastTagWriteMs > 45000);
        if(shouldTag && Vars.state != null && Vars.state.rules != null && Vars.state.rules.tags != null && activeTagKey != null){
            var light = JSON.stringify({version:3, levels:persistentLevels, points:persistentPoints|0, exclusive:exclusiveUnlocked||{}, prestige:prestigeBySector||{}});
            Vars.state.rules.tags.put(activeTagKey, light);
            _lastTagWriteMs = now;
        }
    }catch(e2){}
    if(flush){
        try{
            if(typeof _lastSettingsFlushMs === "undefined") _lastSettingsFlushMs = 0;
            var now2 = Time.millis();
            if(now2 - _lastSettingsFlushMs > 5000){
                Core.settings.manualSave();
                _lastSettingsFlushMs = now2;
            }
        }catch(e3){}
    }
}

function ensurePersistentState(){
    var key = stateStoreKey();
    var tag = stateTagKey();
    if(key !== activeStoreKey || tag !== activeTagKey) loadPersistentState();
}

function levelOf(id){
    ensurePersistentState();
    var v = persistentLevels[id];
    return v == null ? 0 : (v|0);
}
function setLevel(id, lv){
    ensurePersistentState();
    var prev = persistentLevels[id]|0;
    persistentLevels[id] = lv|0;
    // Campaign prestige: at most 1 star per upgrade id (first research only)
    try{ tryGrantResearchPrestigeStar(id, prev, lv); }catch(ePr){}
    savePersistentState(false); // memory only — never manualSave on click
    var u = UPGRADES[id] != null ? UPGRADES[id] : MASTER_UPGRADES[id];
    var isBullet = u != null && u.bulletKind != null;
    var isMaster = u != null && MASTER_UPGRADES[id] != null;

    // Lightweight paths first — never rebuild whole catalog on a single click
    if(isBullet){
        try{ Core.app.post(function(){
            try{ applyAllBulletUpgrades(); }catch(eB){}
            try{ rebuildBulletSwapCache(); }catch(eC){}
        }); }catch(ePostB){}
    }else if(isMaster){
        try{ masterActivationKey = null; activateResearchedMasters(); masterActivationKey = stateStoreKey(); }catch(e2){}
    }else{
        // Ordinary core/conditional: just ranks, no master/ammo/bullet scans
        try{ if(catalogBuilt) refreshGlobalBoostRanks(); }catch(e){}
    }

    if(lv > prev){
        try{
            var bname = "?";
            try{ if(u != null && u.block != null) bname = u.block().localizedName; }catch(e4){}
            pushHistory({
                action: tr("Researched", "Pesquisou") + " → " + (u != null ? upgradeDisplayName(u) : id),
                block: bname,
                pos: null,
                detail: tr("Rank ", "Nível ") + lv
            });
        }catch(eH){}
        // Network/tag sync deferred so the click stays snappy
        try{
            Core.app.post(function(){
                try{
                    if(Vars.net != null && Vars.net.active()) broadcastSync();
                    else writeHostTags();
                }catch(eS){}
            });
        }catch(ePostS){}
    }
}

function getPartial(id){
    ensurePersistentState();
    return persistentPartial[id] == null ? {} : persistentPartial[id];
}
function setPartial(id, obj){
    ensurePersistentState();
    persistentPartial[id] = obj;
    savePersistentState(false);
}
function clearPartial(id){ setPartial(id, {}); }
function paidFor(id, item){
    var p = getPartial(id);
    return p[item.name] == null ? 0 : p[item.name];
}

function remainingCost(u){
    var lv = levelOf(u.id);
    if(lv >= u.max) return [];
    var full = u.cost(lv + 1);
    var out = [];
    for(var i = 0; i < full.length; i++){
        var it = full[i][0];
        var left = full[i][1] - paidFor(u.id, it);
        if(left > 0) out.push([it, left]);
    }
    return out;
}

function installCost(u, lv){
    var base = u.cost(Math.max(1, lv));
    var out = [];
    for(var i = 0; i < base.length; i++){
        out.push([base[i][0], Math.max(1, Math.floor(base[i][1] * 0.35))]);
    }
    return out;
}

function bkey(b){ return b.tile.x + "," + b.tile.y; }
function getApplied(b, id){
    var m = appliedMap[bkey(b)];
    if(m == null) return 0;
    return m[id] == null ? 0 : m[id];
}
function addCachedBoostTarget(build){
    if(build == null || !build.isValid()) return;
    var key = null;
    try{ key = bkey(build); }catch(e){ return; }
    if(cachedBoostTargetKeys[key]) return;
    cachedBoostTargetKeys[key] = true;
    cachedBoostTargets.push(build);
}

function sectorSavePart(){
    try{
        if(isCampaign()){
            var sk = null;
            try{ sk = currentSectorKey(); }catch(e0){}
            if(sk != null && sk !== "") return "sec-" + safePart(sk);
        }
    }catch(e1){}
    try{
        if(Vars.state != null && Vars.state.map != null && Vars.state.map.name != null){
            return "map-" + safePart(""+Vars.state.map.name);
        }
    }catch(e2){}
    return "nosector";
}

function appliedMapStoreKey(){
    // v2: per campaign/save + team + sector/map (installs stay on that sector)
    try{
        return "newtechs-applied-v2-" + safePart(stateStoreKey()) + "-" + sectorSavePart();
    }catch(e){ return "newtechs-applied-v2-default"; }
}

function appliedMapLegacyKeys(){
    var keys = [];
    try{ keys.push("newtechs-applied-" + safePart(stateStoreKey())); }catch(e0){}
    try{ keys.push("newtechs-applied-v2-" + safePart(stateStoreKey()) + "-nosector"); }catch(e1){}
    try{
        // older tomares-style if any
        keys.push("tomares-applied-" + safePart(stateStoreKey()));
    }catch(e2){}
    return keys;
}

function saveAppliedMap(){
    try{
        var key = appliedMapStoreKey();
        Core.settings.put(key, JSON.stringify(appliedMap || {}));
        // also mirror under legacy key for smoother version upgrades
        try{ Core.settings.put("newtechs-applied-" + safePart(stateStoreKey()), JSON.stringify(appliedMap || {})); }catch(eL){}
    }catch(e){}
}

function loadAppliedMap(){
    appliedMap = {};
    try{
        var primary = appliedMapStoreKey();
        var raw = Core.settings.getString(primary, "");
        if(raw != null && raw.length > 2){
            var data = JSON.parse(raw);
            if(data != null && typeof data === "object"){ appliedMap = data; return; }
        }
        // migrate from legacy keys
        var legs = appliedMapLegacyKeys();
        for(var i = 0; i < legs.length; i++){
            try{
                var r2 = Core.settings.getString(legs[i], "");
                if(r2 != null && r2.length > 2){
                    var d2 = JSON.parse(r2);
                    if(d2 != null && typeof d2 === "object" && Object.keys(d2).length > 0){
                        appliedMap = d2;
                        try{ saveAppliedMap(); }catch(eS){} // write to v2 key
                        Log.info("New Tech's: migrated applied installs from " + legs[i]);
                        return;
                    }
                }
            }catch(eOne){}
        }
    }catch(e){ appliedMap = {}; }
}
function setApplied(b, id, lv){
    var k = bkey(b);
    if(appliedMap[k] == null) appliedMap[k] = {};
    appliedMap[k][id] = lv;
    anyBoostActive = true;
    addCachedBoostTarget(b);
    lastBoostTick = -1000;
    // Duo bullet install → refresh ammo variants (uses research rank; install boosts in runtime)
    try{
        if(id != null && (""+id).indexOf("duo") >= 0){
            Core.app.post(function(){
                try{ applyDuoAmmoRank(Math.max(duoResearchRank(), duoBuildingInstallRank(b))); }catch(e){}
            });
        }
    }catch(eDuo){}
    try{ saveAppliedMap(); }catch(eS){}
    // Multiplayer: share install so other players see sprites / effects
    try{
        if(Vars.net != null && Vars.net.active()){
            if(Vars.net.server()){
                broadcastSync();
            }else{
                // Client tells host; host rebroadcasts full state
                try{ Call.serverPacketReliable(NET_PACKET, buildSyncPayload()); }catch(eC){}
            }
        }
    }catch(eNet){}
    try{
        var u = UPGRADES[id];
        pushHistory({
            action: tr("Installed", "Instalou") + " → " + (u != null ? upgradeDisplayName(u) : id),
            block: b.block.localizedName,
            pos: b.tile.x + "," + b.tile.y,
            detail: tr("Install rank ", "Nível instalado ") + lv
        });
    }catch(e){}
}
function maxAppliedBoost(b){
    var m = appliedMap[bkey(b)];
    if(m == null) return 0;
    var best = 0;
    var ids = Object.keys(m);
    for(var i = 0; i < ids.length; i++){
        if(m[ids[i]] > best) best = m[ids[i]];
    }
    return best;
}


// Funny text is OPTIONAL — only shown when player enables it in settings
var FUNNY_OVERRIDES = {
    "mech-speed": {nameEn:"Angry Toothpicks", namePt:"Palitos Bravos", descEn:"Spins faster. Ore was not consulted. Rank %l/3.", descPt:"Gira mais rapido. O minerio nao foi consultado. Rank %l/3."},
    "mech-cap": {nameEn:"Cheeky Pockets", namePt:"Bolsos Safados", descEn:"Holds more rocks before complaining. Rank %l/2.", descPt:"Guarda mais pedra antes de reclamar. Rank %l/2."},
    "pneu-speed": {nameEn:"Overcaffeinated Air", namePt:"Ar com Cafe", descEn:"More pressure, more drama, more ore. Rank %l/3.", descPt:"Mais pressao, mais drama, mais minerio. Rank %l/3."},
    "pneu-boost": {nameEn:"Wet Work Ethic", namePt:"Etica Molhada", descEn:"Loves water. Becomes annoyingly productive. Rank %l/2.", descPt:"Ama agua. Fica irritantemente produtiva. Rank %l/2."},
    "laser-speed": {nameEn:"Laser Pointer of Doom", namePt:"Laserzinho do Destino", descEn:"Beep. Ore gone. Rank %l/3.", descPt:"Bip. Minerio sumiu. Rank %l/3."},
    "laser-optics": {nameEn:"Designer Sunglasses", namePt:"Oculos de Grife", descEn:"Sees hard ore and takes it personally. Rank %l/2.", descPt:"Ve minerio duro e leva pro pessoal. Rank %l/2."},
    "laser-cap": {nameEn:"Cargo Anxiety", namePt:"Ansiedade de Carga", descEn:"Bigger trunk. Still fills up. Rank %l/2.", descPt:"Porta-malas maior. Ainda enche. Rank %l/2."},
    "blast-speed": {nameEn:"Hurricane Mode", namePt:"Modo Furacao", descEn:"The floor is optional. Rank %l/3.", descPt:"O chao e opcional. Rank %l/3."},
    "blast-boost": {nameEn:"Slush Budget", namePt:"Orcamento de Lama", descEn:"Splash water, get rich. Rank %l/2.", descPt:"Joga agua, fica rico. Rank %l/2."},
    "blast-cap": {nameEn:"Bottomless Anxiety", namePt:"Ansiedade sem Fundo", descEn:"More storage. Same stress. Rank %l/2.", descPt:"Mais estoque. Mesmo estresse. Rank %l/2."},
    "water-pump": {nameEn:"Thirst Trap", namePt:"Armadilha de Sede", descEn:"Drinks the planet politely. Rank %l/3.", descPt:"Bebe o planeta com educacao. Rank %l/3."},
    "water-eff": {nameEn:"Panic Canteen", namePt:"Cantil de Panico", descEn:"More water stored for emergencies. Rank %l/2.", descPt:"Mais agua guardada pra emergencia. Rank %l/2."},
    "cult-speed": {nameEn:"Spore Disco", namePt:"Disco de Esporos", descEn:"Grows weird stuff faster. Rank %l/3.", descPt:"Cultiva coisas estranhas mais rapido. Rank %l/3."},
    "cult-eff": {nameEn:"Mushroom Closet", namePt:"Armario de Cogumelo", descEn:"Somewhere to put the spores. Rank %l/2.", descPt:"Um lugar pra guardar os esporos. Rank %l/2."},
    "oil-speed": {nameEn:"Black Gold Panic", namePt:"Panico do Ouro Negro", descEn:"More oil, more problems, more plastic. Rank %l/3.", descPt:"Mais oleo, mais problemas, mais plastico. Rank %l/3."},
    "oil-eff": {nameEn:"Sticky Savings", namePt:"Poupanca Pegajosa", descEn:"Holds more oil without judging you. Rank %l/2.", descPt:"Guarda mais oleo sem te julgar. Rank %l/2."}
};

function upgradeDisplayName(u){
    if(u == null) return "?";
    try{
        if(funnyDescEnabled() && u.id != null && FUNNY_OVERRIDES[u.id] != null){
            var f = FUNNY_OVERRIDES[u.id];
            return tr(f.nameEn, f.namePt);
        }
    }catch(eF){}
    try{ if(typeof u.name === "function") return u.name(); }catch(e){}
    try{ return tr(u.nameEn || u.id || "?", u.namePt || u.nameEn || u.id || "?"); }catch(e2){}
    try{ return "" + (u.id || "?"); }catch(e3){}
    return "?";
}
function upgradeDisplayDesc(u, lv){
    if(u == null) return "";
    lv = lv != null ? lv : 1;
    try{
        if(funnyDescEnabled() && u.id != null && FUNNY_OVERRIDES[u.id] != null){
            var f = FUNNY_OVERRIDES[u.id];
            var a = (""+f.descEn).split("%l").join(""+lv);
            var b = (""+f.descPt).split("%l").join(""+lv);
            return tr(a, b);
        }
    }catch(eF){}
    try{ if(typeof u.desc === "function") return u.desc(lv); }catch(e){}
    try{ return tr(u.descEn || "", u.descPt || u.descEn || ""); }catch(e2){}
    return "";
}
function shortUpgradeDesc(u, lv, maxLen){
    maxLen = maxLen || 64;
    var d = upgradeDisplayDesc(u, lv);
    if(!d) return "";
    // strip color markup for length check
    var plain = (""+d).replace(/\[[^\]]*\]/g, "");
    if(plain.length <= maxLen) return d;
    // cut carefully
    var cut = plain.substring(0, maxLen - 1) + "…";
    return cut;
}
function makeUp(id, blockFn, max, costFn, nameEn, namePt, descEn, descPt, keys, nameEs, nameVi, descEs, descVi){
    return {
        id: id,
        block: blockFn,
        max: max,
        cost: costFn,
        nameEn: nameEn,
        namePt: namePt,
        nameEs: nameEs || nameEn,
        nameVi: nameVi || nameEn,
        descEn: descEn,
        descPt: descPt,
        descEs: descEs || descEn,
        descVi: descVi || descEn,
        keys: keys,
        name: function(){ return tr(this.nameEn, this.namePt, this.nameEs, this.nameVi); },
        desc: function(lv){
            var a = (""+this.descEn).split("%l").join("" + lv);
            var b = (""+this.descPt).split("%l").join("" + lv);
            var c = (""+this.descEs).split("%l").join("" + lv);
            var d = (""+this.descVi).split("%l").join("" + lv);
            return tr(a, b, c, d);
        }
    };
}

function developerNote(u){
    if(u == null) return null;
    var id = "" + (u.id || "");
    var notes = {
        "mech-speed": {en:"DEV NOTE: I have absolutely no idea what I am doing 0-0", pt:"NOTA DO DEV: Não faço ideia do que estou fazendo 0-0"},
        "pneu-boost": {en:"DEV NOTE: Water makes everything better. Probably.", pt:"NOTA DO DEV: Água melhora tudo. Provavelmente."},
        "duo-reload": {en:"DEV NOTE: More bullets = more science. Trust me.", pt:"NOTA DO DEV: Mais balas = mais ciência. Confia."},
        "duo-range": {en:"DEV NOTE: I made the barrel longer. That counts as engineering.", pt:"NOTA DO DEV: Eu deixei o cano maior. Isso conta como engenharia."},
        "arc-power": {en:"DEV NOTE: Please do not touch this while wet.", pt:"NOTA DO DEV: Por favor, não mexa nisso molhado."},
        "water-pump": {en:"DEV NOTE: It is just a bigger hole. Very advanced technology.", pt:"NOTA DO DEV: É só um buraco maior. Tecnologia muito avançada."},
        "master-duo-1": {en:"DEV NOTE: Yes, the Duo now eats metaglass. I regret nothing.", pt:"NOTA DO DEV: Sim, o Duo agora come metaglass. Não me arrependo de nada."},
        "master-scorch-1": {en:"DEV NOTE: Flying enemies were getting too comfortable.", pt:"NOTA DO DEV: Os inimigos voadores estavam confortáveis demais."},
        "master-arc-1": {en:"DEV NOTE: Electricity is basically just spicy water.", pt:"NOTA DO DEV: Eletricidade é basicamente água apimentada."},
        "master-scatter-2": {en:"DEV NOTE: I improved the aim. Somehow it is still terrifying.", pt:"NOTA DO DEV: Eu melhorei a mira. De algum jeito ainda é assustador."},
        "master-hail-1": {en:"DEV NOTE: If it can reach that far, it is probably fine.", pt:"NOTA DO DEV: Se consegue chegar tão longe, provavelmente está tudo bem."},
        "master-salvo-1": {en:"DEV NOTE: Four bullets were not enough. Apparently.", pt:"NOTA DO DEV: Quatro balas não eram suficientes. Aparentemente."},
        "master-lancer-3": {en:"DEV NOTE: More charging. More waiting. Perfect.", pt:"NOTA DO DEV: Mais carga. Mais espera. Perfeito."},
        "master-mechanical-drill-1": {en:"DEV NOTE: I made the drill angrier.", pt:"NOTA DO DEV: Eu deixei a broca mais brava."},
        "master-pneumatic-drill-1": {en:"DEV NOTE: Pressure solves everything until it doesn't.", pt:"NOTA DO DEV: Pressão resolve tudo até não resolver."},
        "master-router-1": {en:"DEV NOTE: I call this organized chaos.", pt:"NOTA DO DEV: Eu chamo isso de caos organizado."},
        "master-junction-1": {en:"DEV NOTE: Now the spaghetti has a degree in logistics.", pt:"NOTA DO DEV: Agora o espaguete tem diploma em logística."},
        "master-copper-wall-1": {en:"DEV NOTE: It is still a wall. Just a suspiciously good one.", pt:"NOTA DO DEV: Ainda é uma parede. Só que suspeitosamente boa."},
        "master-duo-2": {en:"DEV NOTE: Yes, I gave the Duo more buttons. No, I will not explain.", pt:"NOTA DO DEV: Sim, eu dei mais botões para o Duo. Não, não vou explicar."},
        "master-scorch-2": {en:"DEV NOTE: The range was short, so I simply declared it longer.", pt:"NOTA DO DEV: O alcance era curto, então eu simplesmente declarei que era maior."},
        "master-arc-2": {en:"DEV NOTE: Please ignore the suspicious amount of electricity.", pt:"NOTA DO DEV: Ignore a quantidade suspeita de eletricidade."}
    };
        if(notes[id] != null) return notes[id];
    // Funny fallback notes so every card has something
    var pool = [
        {en:"DEV NOTE: I don't know what I am doing.", pt:"NOTA DO DEV: Não sei o que estou fazendo."},
        {en:"DEV NOTE: It compiled. Ship it.", pt:"NOTA DO DEV: Compilou. Pode ir."},
        {en:"DEV NOTE: Balance is a social construct.", pt:"NOTA DO DEV: Balanceamento é construção social."},
        {en:"DEV NOTE: Please do not ask how this works.", pt:"NOTA DO DEV: Por favor não pergunte como isso funciona."},
        {en:"DEV NOTE: Science means bigger numbers.", pt:"NOTA DO DEV: Ciência significa números maiores."},
        {en:"DEV NOTE: I pressed buttons until it looked cool.", pt:"NOTA DO DEV: Apertei botões até ficar legal."},
        {en:"DEV NOTE: If it breaks, it was a feature.", pt:"NOTA DO DEV: Se quebrar, era feature."},
        {en:"DEV NOTE: Sleep is for people without mods.", pt:"NOTA DO DEV: Dormir é para quem não tem mods."},
        {en:"DEV NOTE: Yes, this is intentional. Probably.", pt:"NOTA DO DEV: Sim, isso é intencional. Provavelmente."},
        {en:"DEV NOTE: More cards = more power. Trust me.", pt:"NOTA DO DEV: Mais cards = mais poder. Confia."},
        {en:"DEV NOTE: This one passed the extremely scientific coffee test.", pt:"NOTA DO DEV: Esse passou no teste extremamente científico do café."},
        {en:"DEV NOTE: I added this because the turret looked bored.", pt:"NOTA DO DEV: Adicionei isso porque a torreta parecia entediada."},
        {en:"DEV NOTE: Six ammo options sounded reasonable at 3 AM.", pt:"NOTA DO DEV: Seis opções de munição pareceram razoáveis às 3 da manhã."},
        {en:"DEV NOTE: The spreadsheet said yes. The spreadsheet is in charge now.", pt:"NOTA DO DEV: A planilha disse sim. A planilha manda agora."},
        {en:"DEV NOTE: Unit balance meeting postponed indefinitely.", pt:"NOTA DO DEV: Reunião de balanceamento das unidades adiada indefinidamente."},
        {en:"DEV NOTE: If the unit is still weak, add more engineering.", pt:"NOTA DO DEV: Se a unidade ainda estiver fraca, adicione mais engenharia."},
        {en:"DEV NOTE: This projectile has a degree in being useful.", pt:"NOTA DO DEV: Esse projétil tem diploma em ser útil."},
        {en:"DEV NOTE: I definitely tested this. Probably.", pt:"NOTA DO DEV: Eu definitivamente testei isso. Provavelmente."},
        {en:"DEV NOTE: No turrets were emotionally harmed during testing.", pt:"NOTA DO DEV: Nenhuma torreta sofreu danos emocionais durante os testes."},
        {en:"DEV NOTE: If the numbers look scary, they are working.", pt:"NOTA DO DEV: Se os números parecem assustadores, está funcionando."},
        {en:"DEV NOTE: Ammo is now doing something besides sitting in storage.", pt:"NOTA DO DEV: A munição agora faz algo além de ficar parada no armazenamento."},
        {en:"DEV NOTE: I called this balanced and nobody stopped me.", pt:"NOTA DO DEV: Eu chamei isso de balanceado e ninguém me impediu."},
        {en:"DEV NOTE: Research first, questions later.", pt:"NOTA DO DEV: Pesquisa primeiro, perguntas depois."},
        {en:"DEV NOTE: The turret asked for options. I gave it too many.", pt:"NOTA DO DEV: A torreta pediu opções. Eu dei opções demais."},
        {en:"DEV NOTE: This is what happens when optimization gets bored.", pt:"NOTA DO DEV: É isso que acontece quando a otimização fica entediada."}
    ];
    var pick = blockSeed(id) % pool.length;
    return pool[pick];
}

function makeGlobalUp(id, blockFn, max, costFn, nameEn, namePt, descEn, descPt, keys, globalKind){
    var u = makeUp(id, blockFn, max, costFn, nameEn, namePt, descEn, descPt, keys);
    u.globalResearch = true;
    u.globalKind = globalKind;
    return u;
}

var UPGRADES = {
    "mech-speed": makeUp("mech-speed", function(){ return Blocks.mechanicalDrill; }, 3,
        function(lv){ return [[Items.copper, 120+lv*80],[Items.lead,40+lv*40]]; },
        "Hardened Bits", "Brocas Endurecidas",
        "Mining speed (rank %l/3).", "Velocidade de mineracao (rank %l/3).",
        "mech mechanical drill broca mecanica speed velocidade bits"),
    "mech-cap": makeUp("mech-cap", function(){ return Blocks.mechanicalDrill; }, 2,
        function(lv){ return [[Items.copper,100+lv*60],[Items.lead,60+lv*40]]; },
        "Larger Hopper", "Hopper Ampliado",
        "Capacity rank %l/2.", "Capacidade rank %l/2.",
        "mech mechanical drill broca mecanica hopper capacity capacidade"),
    "pneu-speed": makeUp("pneu-speed", function(){ return Blocks.pneumaticDrill; }, 3,
        function(lv){ return [[Items.copper,180+lv*100],[Items.graphite,60+lv*40]]; },
        "High Pressure", "Alta Pressao",
        "Mining speed rank %l/3.", "Velocidade rank %l/3.",
        "pneu pneumatic drill broca pneumatica speed pressao"),
    "pneu-boost": makeUp("pneu-boost", function(){ return Blocks.pneumaticDrill; }, 2,
        function(lv){ return [[Items.graphite,80+lv*50],[Items.titanium,40+lv*30]]; },
        "Coolant Jets", "Jatos de Refrigerante",
        "Water boost rank %l/2.", "Boost de agua rank %l/2.",
        "pneu pneumatic water agua boost coolant"),
    "laser-speed": makeUp("laser-speed", function(){ return Blocks.laserDrill; }, 3,
        function(lv){ return [[Items.silicon,80+lv*60],[Items.titanium,60+lv*40],[Items.graphite,50+lv*30]]; },
        "Focused Beam", "Feixe Focado",
        "Mining speed rank %l/3.", "Velocidade rank %l/3.",
        "laser drill broca feixe beam speed"),
    "laser-optics": makeUp("laser-optics", function(){ return Blocks.laserDrill; }, 2,
        function(lv){ return [[Items.silicon,100+lv*70],[Items.titanium,50+lv*40]]; },
        "Efficient Optics", "Optica Eficiente",
        "Hard ore rank %l/2.", "Minerio duro rank %l/2.",
        "laser optics optica"),
    "laser-cap": makeUp("laser-cap", function(){ return Blocks.laserDrill; }, 2,
        function(lv){ return [[Items.titanium,70+lv*50],[Items.graphite,60+lv*40]]; },
        "Storage Bay", "Baia de Armazenamento",
        "Capacity rank %l/2.", "Capacidade rank %l/2.",
        "laser storage capacity capacidade"),
    "blast-speed": makeUp("blast-speed", function(){ return Blocks.blastDrill; }, 3,
        function(lv){ return [[Items.titanium,100+lv*70],[Items.thorium,80+lv*50],[Items.silicon,70+lv*40]]; },
        "Overdriven Fans", "Ventiladores Sobrecarregados",
        "Mining speed rank %l/3.", "Velocidade rank %l/3.",
        "blast airblast drill broca ar speed"),
    "blast-boost": makeUp("blast-boost", function(){ return Blocks.blastDrill; }, 2,
        function(lv){ return [[Items.thorium,90+lv*60],[Items.titanium,80+lv*50]]; },
        "Cryo Injection", "Injecao Criogenica",
        "Liquid boost rank %l/2.", "Boost liquido rank %l/2.",
        "blast airblast cryo boost"),
    "blast-cap": makeUp("blast-cap", function(){ return Blocks.blastDrill; }, 2,
        function(lv){ return [[Items.thorium,70+lv*50],[Items.silicon,60+lv*40]]; },
        "Bulk Hopper", "Hopper em Massa",
        "Capacity rank %l/2.", "Capacidade rank %l/2.",
        "blast airblast capacity capacidade hopper"),
    "water-pump": makeUp("water-pump", function(){ return Blocks.waterExtractor; }, 3,
        function(lv){ return [[Items.copper,100+lv*70],[Items.lead,80+lv*50],[Items.graphite,40+lv*30]]; },
        "Deep Bore", "Perfuracao Profunda",
        "Pump rate rank %l/3.", "Bombeamento rank %l/3.",
        "water extractor extrator agua pump"),
    "water-eff": makeUp("water-eff", function(){ return Blocks.waterExtractor; }, 2,
        function(lv){ return [[Items.metaglass,50+lv*40],[Items.graphite,40+lv*30]]; },
        "Reservoir Tank", "Tanque Reservatorio",
        "Liquid capacity rank %l/2.", "Capacidade liquido rank %l/2.",
        "water extractor capacity tanque"),
    "cult-speed": makeUp("cult-speed", function(){ return Blocks.cultivator; }, 3,
        function(lv){ return [[Items.copper,80+lv*50],[Items.lead,60+lv*40],[Items.silicon,30+lv*25]]; },
        "Fertile Soil", "Solo Fertil",
        "Production rank %l/3.", "Producao rank %l/3.",
        "cultivator cultivador spore"),
    "cult-eff": makeUp("cult-eff", function(){ return Blocks.cultivator; }, 2,
        function(lv){ return [[Items.silicon,50+lv*40],[Items.titanium,30+lv*25]]; },
        "Spore Bins", "Silos de Esporos",
        "Capacity rank %l/2.", "Capacidade rank %l/2.",
        "cultivator capacity silo"),
    "oil-speed": makeUp("oil-speed", function(){ return Blocks.oilExtractor; }, 3,
        function(lv){ return [[Items.copper,150+lv*80],[Items.graphite,80+lv*50],[Items.thorium,40+lv*30]]; },
        "High Flow Valves", "Valvulas de Alto Fluxo",
        "Extraction rank %l/3.", "Extracao rank %l/3.",
        "oil extractor extrator oleo oil"),
    "oil-eff": makeUp("oil-eff", function(){ return Blocks.oilExtractor; }, 2,
        function(lv){ return [[Items.titanium,60+lv*40],[Items.silicon,50+lv*35]]; },
        "Crude Storage", "Armazenamento de Bruto",
        "Liquid capacity rank %l/2.", "Capacidade liquido rank %l/2.",
        "oil extractor capacity"),
    "duo-reload": makeUp("duo-reload", function(){ return Blocks.duo; }, 3,
        function(lv){ return [[Items.copper,80+lv*50],[Items.lead,60+lv*40]]; },
        "Servo Motors", "Motores Servo",
        "Fire rate rank %l/3.", "Cadencia rank %l/3.",
        "duo turret torre reload fire rate cadencia"),
    "duo-range": makeUp("duo-range", function(){ return Blocks.duo; }, 2,
        function(lv){ return [[Items.copper,100+lv*60],[Items.graphite,40+lv*30]]; },
        "Long Barrels", "Canos Longos",
        "Range rank %l/2.", "Alcance rank %l/2.",
        "duo range alcance barrel"),
    "arc-power": makeUp("arc-power", function(){ return Blocks.arc; }, 3,
        function(lv){ return [[Items.lead,100+lv*60],[Items.copper,80+lv*50],[Items.silicon,50+lv*40]]; },
        "High Voltage", "Alta Tensao",
        "Damage rank %l/3.", "Dano rank %l/3.",
        "arc turret torre lightning raio damage dano voltage"),
    "arc-range": makeUp("arc-range", function(){ return Blocks.arc; }, 2,
        function(lv){ return [[Items.lead,80+lv*50],[Items.silicon,40+lv*30]]; },
        "Coil Extension", "Extensao de Bobina",
        "Range rank %l/2.", "Alcance rank %l/2.",
        "arc range alcance coil bobina")
};


// Buff water-related drill upgrades
try{
    if(UPGRADES["pneu-boost"] != null){ UPGRADES["pneu-boost"].waterBoostEach = 0.22; UPGRADES["pneu-boost"].boostEach = 0.05; }
    if(UPGRADES["blast-boost"] != null){ UPGRADES["blast-boost"].waterBoostEach = 0.24; UPGRADES["blast-boost"].boostEach = 0.05; }
}catch(eWBoost){}

var GROUPS = [
    { titleEn: "Mechanical Drill", titlePt: "Broca Mecanica", block: function(){ return Blocks.mechanicalDrill; }, upgrades: ["mech-speed","mech-cap"], isDrillGroup: true, planet: "shared" },
    { titleEn: "Pneumatic Drill", titlePt: "Broca Pneumatica", block: function(){ return Blocks.pneumaticDrill; }, upgrades: ["pneu-speed","pneu-boost"], isDrillGroup: true, planet: "shared" },
    { titleEn: "Laser Drill", titlePt: "Broca a Laser", block: function(){ return Blocks.laserDrill; }, upgrades: ["laser-speed","laser-optics","laser-cap"], isDrillGroup: true, planet: "shared" },
    { titleEn: "Airblast Drill", titlePt: "Broca de Ar", block: function(){ return Blocks.blastDrill; }, upgrades: ["blast-speed","blast-boost","blast-cap"], isDrillGroup: true, planet: "shared" },
    { titleEn: "Water Extractor", titlePt: "Extrator de Agua", block: function(){ return Blocks.waterExtractor; }, upgrades: ["water-pump","water-eff"], planet: "serpulo" },
    { titleEn: "Cultivator", titlePt: "Cultivador", block: function(){ return Blocks.cultivator; }, upgrades: ["cult-speed","cult-eff"], planet: "serpulo" },
    { titleEn: "Oil Extractor", titlePt: "Extrator de Oleo", block: function(){ return Blocks.oilExtractor; }, upgrades: ["oil-speed","oil-eff"], planet: "serpulo" },
    { titleEn: "Duo", titlePt: "Duo", block: function(){ return Blocks.duo; }, upgrades: ["duo-reload","duo-range"], planet: "serpulo" },
    { titleEn: "Arc", titlePt: "Arc", block: function(){ return Blocks.arc; }, upgrades: ["arc-power","arc-range"], planet: "serpulo" }
];

function autoCost(blockFn, idx, lv){
    var b = blockFn();
    var req = b != null ? b.requirements : null;
    if(req == null || req.length === 0) return [[Items.copper, 100 + idx * 40 + lv * 50]];

    var out = [];
    var take = Math.min(3, req.length);
    for(var i = 0; i < take; i++){
        var r = req[(i + idx) % req.length];
        if(r != null && r.item != null){
            var mult = 0.55 + idx * 0.12;
            var amt = Math.max(20, Math.floor(r.amount * mult) + lv * (15 + idx * 5));
            out.push([r.item, amt]);
        }
    }
    return out;
}

var CATEGORY_ORDER = [
    "production", "crafting", "turret", "liquid", "defense", "power", "effect", "unit", "logic"
];
var BULLET_CATEGORY = "bullet";
var CATEGORY_LABELS_EN = {
    distribution: "DISTRIBUTION",
    production: "PRODUCTION",
    crafting: "CRAFTING",
    turret: "TURRET",
    bullet: "BULLET UPGRADE",
    liquid: "LIQUID",
    defense: "DEFENSE",
    power: "ENERGY",
    effect: "EFFECT",
    unit: "UNIT",
    logic: "LOGIC"
};
var CATEGORY_LABELS_PT = {
    distribution: "Distribuição",
    production: "Produção",
    crafting: "Crafting",
    turret: "Torreta",
    bullet: "Upgrade de Tiro",
    liquid: "Líquido",
    defense: "Defesa",
    power: "Energia",
    effect: "Efeito",
    unit: "Unidade",
    logic: "Lógica"
};
var CATEGORY_LABELS_ES = {
    distribution: "Distribución",
    production: "Producción",
    crafting: "Fabricación",
    turret: "Torreta",
    bullet: "Mejora de Bala",
    liquid: "Líquido",
    defense: "Defensa",
    power: "Energía",
    effect: "Efecto",
    unit: "Unidad",
    logic: "Lógica"
};
var CATEGORY_LABELS_VI = {
    distribution: "Vận chuyển",
    production: "Khai thác",
    crafting: "Chế tạo",
    turret: "Tháp pháo",
    bullet: "Nâng cấp đạn",
    liquid: "Chất lỏng",
    defense: "Phòng thủ",
    power: "Năng lượng",
    effect: "Hiệu ứng",
    unit: "Đơn vị",
    logic: "Logic"
};
function catLabel(cat){
    var l = lang();
    if(l === "pt") return CATEGORY_LABELS_PT[cat] || cat;
    if(l === "es") return CATEGORY_LABELS_ES[cat] || cat;
    if(l === "vi") return CATEGORY_LABELS_VI[cat] || cat;
    return CATEGORY_LABELS_EN[cat] || cat;
}

var CATEGORY_STYLE = {
    distribution: {col:"[#f0ad4e]", tipEn:"Belts, ducts and routing", tipPt:"Esteiras, dutos e roteamento"},
    production:   {col:"[#5cb85c]", tipEn:"Drills and extractors", tipPt:"Brocas e extratores"},
    crafting:     {col:"[#5bc0de]", tipEn:"Factories and presses", tipPt:"Fabricas e prensas"},
    turret:       {col:"[#d9534f]", tipEn:"Defensive turrets", tipPt:"Torres de defesa"},
    bullet:       {col:"[#ff8a65]", tipEn:"Bullet damage & fire rate", tipPt:"Dano e cadencia de tiros"},
    liquid:       {col:"[#4fc3f7]", tipEn:"Pumps and conduits", tipPt:"Bombas e condutos"},
    defense:      {col:"[#9e9e9e]", tipEn:"Walls and shields", tipPt:"Paredes e escudos"},
    power:        {col:"[#ffd54f]", tipEn:"Generation and batteries", tipPt:"Geracao e baterias"},
    effect:       {col:"[#ba68c8]", tipEn:"Support and projectors", tipPt:"Suporte e projetores"},
    unit:         {col:"[#81c784]", tipEn:"Factories and pads", tipPt:"Fabricas e plataformas"},
    logic:        {col:"[#90a4ae]", tipEn:"Processors and switches", tipPt:"Processadores e switches"}
};
function categoryIcon(cat){
    try{
        if(cat === "distribution") return Icon.box;
        if(cat === "production") return Icon.wrench;
        if(cat === "crafting") return Icon.crafting;
        if(cat === "turret") return Icon.turret;
        if(cat === "bullet"){ try{ return Icon.turret; }catch(e){ return Icon.ok; } }
        if(cat === "ammo"){ try{ return Icon.turret; }catch(e){ return Icon.ok; } }
        if(cat === "liquid") return Icon.liquid;
        if(cat === "defense") return Icon.defense;
        if(cat === "power") return Icon.power;
        if(cat === "effect") return Icon.effect;
        if(cat === "unit") return Icon.units;
        if(cat === "logic") return Icon.logic;
    }catch(e){}
    return Icon.book;
}

var CATEGORY_NAMES_EN = {
    crafting: ["Recipe Precision", "Thermal Harmony", "Catalyst Feed", "Parallel Crafting", "Crafting Overclock"],
    distribution: ["High-Speed Routing", "Reinforced Guides", "Traffic Control", "Buffer Network", "Logistics Overclock"],
    production: ["Precision Assembly", "Thermal Calibration", "Automated Feed", "Parallel Chambers", "Overclock Matrix"],
    turret: ["Servo Aim", "Rapid Cycle", "Targeting Array", "Barrel Tuning", "Combat Overclock"],
    liquid: ["Flow Pressure", "Valve Tuning", "Reservoir Control", "Pipe Calibration", "Hydraulic Overdrive"],
    defense: ["Reinforced Frame", "Impact Bracing", "Rapid Recovery", "Shield Tuning", "Fortress Overclock"],
    power: ["Flux Tuning", "Voltage Regulation", "Thermal Balancing", "Grid Stabilizer", "Overcharged Core"],
    effect: ["Emitter Calibration", "Pulse Focusing", "Field Amplifier", "Cycle Optimization", "Effect Overdrive"],
    unit: ["Assembly Precision", "Servo Control", "Fabrication Feed", "Parallel Assembly", "Unit Overclock"],
    logic: ["Clock Tuning", "Instruction Routing", "Memory Handling", "Processor Cooling", "Logic Overclock"]
};
var CATEGORY_NAMES_PT = {
    crafting: ["Precisão de Receita", "Harmonia Térmica", "Alimentação de Catalisador", "Crafting Paralelo", "Overclock de Crafting"],
    distribution: ["Roteamento de Alta Velocidade", "Guias Reforcadas", "Controle de Trafego", "Rede de Buffer", "Overclock Logistico"],
    production: ["Montagem de Precisao", "Calibracao Termica", "Alimentacao Automatica", "Camara Paralela", "Matriz de Overclock"],
    turret: ["Mira Servo", "Ciclo Rapido", "Matriz de Mira", "Ajuste do Cano", "Overclock de Combate"],
    liquid: ["Pressao de Fluxo", "Ajuste de Valvulas", "Controle de Reservatorio", "Calibracao de Tubos", "Overdrive Hidraulico"],
    defense: ["Estrutura Reforcada", "Blindagem de Impacto", "Recuperacao Rapida", "Ajuste de Escudo", "Overclock de Fortaleza"],
    power: ["Ajuste de Fluxo", "Regulacao de Tensao", "Balanceamento Termico", "Estabilizador da Rede", "Nucleo Sobrecarregado"],
    effect: ["Calibracao do Emissor", "Foco de Pulsos", "Amplificador de Campo", "Otimizacao de Ciclo", "Overdrive de Efeito"],
    unit: ["Precisao de Montagem", "Controle de Servo", "Alimentacao de Fabricacao", "Montagem Paralela", "Overclock de Unidade"],
    logic: ["Ajuste de Clock", "Roteamento de Instrucoes", "Gerenciamento de Memoria", "Resfriamento do Processador", "Overclock Logico"]
};
var BLOCK_GROUPS = {};
var CATEGORY_GROUPS = {};
var GLOBAL_TRANSPORT_BY_BLOCK = {};
var GLOBAL_TRANSPORT_GROUPS = {};
var catalogBuilt = false;
var MASTER_UPGRADES = {};

function masterId(blockName, index){
    return "master-" + safePart(blockName) + "-" + (index + 1);
}

function masterSpecsForBlock(block){
    var n = block == null ? "" : ("" + block.name).toLowerCase();
    var specs = [];
    if(n === "duo") specs = [
        {en:"Metaglass Ammunition",pt:"Munição de Metaglass",kind:"duo-metaglass",descEn:"Unlocks metaglass as a new ammunition type. It keeps the Duo's normal ammo and adds a specialized projectile.",descPt:"Desbloqueia metaglass como nova munição. Mantém a munição normal do Duo e adiciona um projétil especializado."},
        {en:"Predictive Aim",pt:"Mira Preditiva",kind:"turret-air",descEn:"Adds air-targeting capability and improves tracking response.",descPt:"Adiciona capacidade de atingir alvos aéreos e melhora a resposta de mira."},
        {en:"Twin Feed",pt:"Alimentação Dupla",kind:"turret-dual",descEn:"Expands the Duo's firing system into a higher-throughput two-feed weapon.",descPt:"Expande o sistema de disparo do Duo para uma arma de maior fluxo com duas alimentações."}
    ];
    else if(n === "scorch") specs = [
        {en:"Anti-Air Ignition",pt:"Ignição Antiaérea",kind:"scorch-air",descEn:"The Scorch can now target flying enemies with its flame weapon.",descPt:"O Scorch agora pode mirar em inimigos voadores com sua arma de fogo."},
        {en:"Long-Flame Nozzle",pt:"Bocal de Chama Longa",kind:"turret-range",descEn:"Extends the effective reach of the flame weapon.",descPt:"Aumenta o alcance efetivo da arma de chamas."},
        {en:"Flash Igniter",pt:"Ignição Relâmpago",kind:"turret-burst",descEn:"Adds a stronger opening burst after the turret acquires a target.",descPt:"Adiciona uma rajada inicial mais forte após a torre adquirir um alvo."}
    ];
    else if(n === "arc") specs = [
        {en:"Chain Conduction",pt:"Condução em Cadeia",kind:"arc-chain",descEn:"The Arc can chain its electrical attack to an additional nearby target.",descPt:"O Arc pode encadear seu ataque elétrico para um alvo próximo adicional."},
        {en:"Predictive Aim",pt:"Mira Preditiva",kind:"turret-air",descEn:"Improves tracking and enables air targeting.",descPt:"Melhora a mira e habilita alvos aéreos."},
        {en:"Overvoltage",pt:"Sobretensão",kind:"turret-burst",descEn:"Adds a stronger electrical opening burst.",descPt:"Adiciona uma rajada elétrica inicial mais forte."}
    ];
    else if(n === "scatter") specs = [
        {en:"Slug Chamber",pt:"Câmara de Projétil",kind:"turret-ammo",descEn:"Adds a heavier secondary firing profile to the Scatter.",descPt:"Adiciona um perfil secundário de disparo mais pesado ao Scatter."},
        {en:"Predictive Aim",pt:"Mira Preditiva",kind:"turret-air",descEn:"Improves tracking against fast air targets.",descPt:"Melhora a mira contra alvos aéreos rápidos."},
        {en:"Wide Choke",pt:"Dispersão Ampliada",kind:"turret-spread",descEn:"Widened firing pattern for closer targets.",descPt:"Aumenta o padrão de dispersão contra alvos próximos."}
    ];
    else if(n === "hail") specs = [
        {en:"Guided Shells",pt:"Projéteis Guiados",kind:"turret-guided",descEn:"Improves projectile guidance after firing.",descPt:"Melhora a orientação dos projéteis após o disparo."},
        {en:"Predictive Aim",pt:"Mira Preditiva",kind:"turret-air",descEn:"Improves tracking and enables air targeting.",descPt:"Melhora a mira e habilita alvos aéreos."},
        {en:"Bunker Breaker",pt:"Quebra-Bunkers",kind:"turret-burst",descEn:"Adds a stronger impact profile against ground targets.",descPt:"Adiciona um impacto mais forte contra alvos terrestres."}
    ];
    else if(n === "salvo") specs = [
        {en:"Burst Logic",pt:"Lógica de Rajada",kind:"turret-burst",descEn:"Adds a stronger opening burst to the Salvo's firing cycle.",descPt:"Adiciona uma rajada inicial mais forte ao ciclo do Salvo."},
        {en:"Predictive Aim",pt:"Mira Preditiva",kind:"turret-air",descEn:"Improves tracking and enables air targeting.",descPt:"Melhora a mira e habilita alvos aéreos."},
        {en:"Ammo Mixer",pt:"Misturador de Munição",kind:"turret-ammo",descEn:"Adds a specialized secondary ammo profile when supported.",descPt:"Adiciona um perfil secundário de munição quando suportado."}
    ];
    else if(n === "lancer") specs = [
        {en:"Piercing Lance",pt:"Lança Perfurante",kind:"turret-pierce",descEn:"The lance projectile gains stronger piercing behavior.",descPt:"O projétil da lança ganha comportamento de perfuração mais forte."},
        {en:"Predictive Aim",pt:"Mira Preditiva",kind:"turret-air",descEn:"Improves tracking and enables air targeting.",descPt:"Melhora a mira e habilita alvos aéreos."},
        {en:"Charged Chamber",pt:"Câmara Carregada",kind:"turret-burst",descEn:"Adds a stronger charged opening shot.",descPt:"Adiciona um disparo inicial carregado mais forte."}
    ];
    else if(n === "duo"){}
    if(specs.length === 0){
        var cat = categoryOfBlock(block);
        if(cat === "turret") specs = [
            {en:"Adaptive Targeting",pt:"Mira Adaptativa",kind:"turret-air",descEn:"Unlocks improved tracking and air targeting where the weapon supports it.",descPt:"Desbloqueia melhor rastreamento e mira aérea quando a arma suporta isso."},
            {en:"Specialized Chamber",pt:"Câmara Especializada",kind:"turret-burst",descEn:"Adds a specialized firing behavior to the turret.",descPt:"Adiciona um comportamento especializado de disparo à torre."},
            {en:"Combat Protocol",pt:"Protocolo de Combate",kind:"turret-response",descEn:"Improves target acquisition and firing response.",descPt:"Melhora a aquisição de alvos e a resposta de disparo."}
        ];
        else if(cat === "production" || cat === "crafting") specs = [
            {en:"Parallel Processing",pt:"Processamento Paralelo",kind:"factory-parallel",descEn:"Adds a secondary processing cycle to reduce idle time.",descPt:"Adiciona um ciclo secundário de processamento para reduzir tempo ocioso."},
            {en:"Adaptive Feed",pt:"Alimentação Adaptativa",kind:"factory-feed",descEn:"Improves handling of input materials and production flow.",descPt:"Melhora o tratamento dos materiais de entrada e o fluxo de produção."},
            {en:"Emergency Cycle",pt:"Ciclo de Emergência",kind:"factory-burst",descEn:"Adds a temporary production surge after idle periods.",descPt:"Adiciona um surto temporário de produção após períodos ociosos."}
        ];
        else if(cat === "liquid") specs = [
            {en:"Pressure Reserve",pt:"Reserva de Pressão",kind:"liquid-reserve",descEn:"Stores a reserve of liquid to smooth short interruptions.",descPt:"Armazena uma reserva de líquido para suavizar interrupções curtas."},
            {en:"Fluid Separation",pt:"Separação de Fluidos",kind:"liquid-separation",descEn:"Improves fluid handling when multiple liquid types are supported.",descPt:"Melhora o manuseio de fluidos quando vários tipos são suportados."},
            {en:"Surge Valve",pt:"Válvula de Surto",kind:"liquid-burst",descEn:"Adds a short high-flow discharge cycle.",descPt:"Adiciona um curto ciclo de descarga de alto fluxo."}
        ];
        else specs = [
            {en:"Reinforced Core",pt:"Núcleo Reforçado",kind:"generic-cap",descEn:"Adds a block-specific capacity or resilience improvement.",descPt:"Adiciona uma melhoria específica de capacidade ou resistência."},
            {en:"Adaptive System",pt:"Sistema Adaptativo",kind:"generic-adaptive",descEn:"Adds a behavior tuned to this block's role.",descPt:"Adiciona um comportamento ajustado à função deste bloco."},
            {en:"Emergency Protocol",pt:"Protocolo de Emergência",kind:"generic-emergency",descEn:"Unlocks a special response when the block is under pressure.",descPt:"Desbloqueia uma resposta especial quando o bloco está sob pressão."}
        ];
    }
    return specs.slice(0,3);
}

function makeMasterUp(id, blockFn, costFn, spec){
    var b = blockFn != null ? blockFn() : null;
    var loc = b != null && b.localizedName != null ? ("" + b.localizedName) : "Block";
    var u = makeUp(id, blockFn, 1, costFn, loc + " — " + spec.en, loc + " — " + spec.pt, spec.descEn + " // " + loc, spec.descPt + " // " + loc, id + " master upgrade");
    u.master = true;
    u.masterKind = spec.kind;
    return u;
}

function ensureMasterUpgrades(group){
    if(group == null) return;
    var b = group.block();
    if(b == null) return;
    if(group.masterUpgrades != null && group.masterUpgrades.length > 0) return;
    group.masterUpgrades = [];
    var target = rangeCount(blockSeed(b.name) >> 5, 3, 5); // 3-5 master cards
    group.masterCount = target;
    var specs = masterSpecsForBlock(b);
    if(specs == null) specs = [];
    var fillers = [
        {en:"Overclock Core", pt:"Nucleo Overclock", kind:"generic-overclock",
            descEn:"Pushes the block harder. Short words: more output.", descPt:"Força o bloco. Em poucas palavras: mais saida."},
        {en:"Reinforced Frame", pt:"Estrutura Reforçada", kind:"generic-frame",
            descEn:"Sturdier internals. Runs a bit smoother under load.", descPt:"Interior mais firme. Roda um pouco mais estavel sob carga."},
        {en:"Emergency Surge", pt:"Surto de Emergencia", kind:"generic-surge",
            descEn:"A brief performance spike when things get messy.", descPt:"Um pico breve de desempenho quando a coisa aperta."},
        {en:"Precision Tuning", pt:"Ajuste de Precisao", kind:"generic-tune",
            descEn:"Fine-tunes the operating cycle for fewer wasted ticks.", descPt:"Ajusta o ciclo para desperdiçar menos ticks."},
        {en:"Field Calibration", pt:"Calibracao de Campo", kind:"generic-field",
            descEn:"Aligns sensors and actuators. Mostly works.", descPt:"Alinha sensores e atuadores. Na maior parte funciona."}
    ];
    var fi = 0;
    while(specs.length < target){
        specs.push(fillers[fi % fillers.length]);
        fi++;
    }
    for(var i = 0; i < target; i++){
        var id = masterId("" + b.name, i);
        if(MASTER_UPGRADES[id] == null){
            (function(upId, spec, index){
                MASTER_UPGRADES[upId] = makeMasterUp(upId, group.block, function(lv){
                    return autoMasterCost(group.block, index, lv);
                }, spec);
            })(id, specs[i], i);
        }
        group.masterUpgrades.push(id);
    }
}


function isTurretBlock(b){
    if(b == null) return false;
    try{
        var cat = categoryOfBlock(b);
        if(cat === "turret" || cat === "turrets") return true;
    }catch(e0){}
    try{
        var cls = classNameOf(b).toLowerCase();
        if(cls.indexOf("turret") >= 0) return true;
    }catch(e1){}
    try{
        var n = (""+b.name).toLowerCase();
        if(n.indexOf("turret") >= 0 || n === "duo" || n === "scatter" || n === "scorch"
            || n === "hail" || n === "wave" || n === "lancer" || n === "arc" || n === "parallax"
            || n === "swarmer" || n === "salvo" || n === "segment" || n === "tsunami"
            || n === "fuse" || n === "ripple" || n === "cyclone" || n === "foreshadow"
            || n === "spectre" || n === "meltdown" || n === "breach" || n === "diffuse"
            || n === "sublimate" || n === "titan" || n === "afflict" || n === "lustre"
            || n === "scathe" || n === "smite" || n === "malign") return true;
    }catch(e2){}
    return false;
}

/** COMBO = at least 3 research ranks across normal (non ultimate/final) cards on this block */
function blockHasCombo(block){
    if(block == null) return false;
    try{
        var g = BLOCK_GROUPS[""+block.name];
        if(g == null || g.upgrades == null) return false;
        var sum = 0;
        for(var i = 0; i < g.upgrades.length; i++){
            var id = g.upgrades[i];
            var u = UPGRADES[id];
            if(u != null && (u.tier === "ultimate" || u.tier === "final")) continue;
            sum += levelOf(id)|0;
            if(sum >= 3) return true;
        }
    }catch(e){}
    return false;
}

function ultimateIdFor(block){
    return "ultimate-" + (block != null ? block.name : "x");
}
function finalIdFor(block){
    return "final-" + (block != null ? block.name : "x");
}

function ensureUltimateFinalCards(group){
    if(group == null) return;
    var b = group.block != null ? group.block() : null;
    if(b == null || !isTurretBlock(b)) return;
    if(group.upgrades == null) group.upgrades = [];
    var ultId = ultimateIdFor(b);
    var finId = finalIdFor(b);

    if(UPGRADES[ultId] == null){
        UPGRADES[ultId] = makeUp(
            ultId, group.block, 1,
            function(lv){
                return [
                    [Items.surgeAlloy, 220],
                    [Items.phaseFabric, 160],
                    [Items.thorium, 280],
                    [Items.silicon, 320],
                    [Items.plastanium, 140],
                    [Items.titanium, 200]
                ];
            },
            "ULTIMATE // Hypercycle Barrel",
            "ULTIMATE // Cano Hiperciclo",
            "Requires COMBO. Huge fire-rate boost. Very expensive.",
            "Precisa de COMBO. Cadencia enorme. Muito caro.",
            "ultimate hypercycle fire rate turret"
        );
        UPGRADES[ultId].tier = "ultimate";
        UPGRADES[ultId].boostEach = 0.75;
        UPGRADES[ultId].nameEs = "ULTIMATE // Barril Hiperciclo";
        UPGRADES[ultId].nameVi = "ULTIMATE // Nong Hipercycle";
        UPGRADES[ultId].descEs = "Requiere COMBO. Gran cadencia. Muy caro.";
        UPGRADES[ultId].descVi = "Can COMBO. Ban rat rat cao. Rat dat.";
    }
    if(UPGRADES[finId] == null){
        UPGRADES[finId] = makeUp(
            finId, group.block, 1,
            function(lv){
                return [
                    [Items.surgeAlloy, 400],
                    [Items.phaseFabric, 300],
                    [Items.thorium, 450],
                    [Items.silicon, 500],
                    [Items.plastanium, 280],
                    [Items.titanium, 350],
                    [Items.copper, 600],
                    [Items.lead, 600]
                ];
            },
            "FINAL // Absolute Overdrive",
            "FINAL // Overdrive Absoluto",
            "Requires ULTIMATE. Maximum fire-rate style. Extremely expensive.",
            "Precisa de ULTIMATE. Cadencia maxima. Extremamente caro.",
            "final absolute overdrive fire rate turret"
        );
        UPGRADES[finId].tier = "final";
        UPGRADES[finId].boostEach = 1.25;
        UPGRADES[finId].nameEs = "FINAL // Overdrive Absoluto";
        UPGRADES[finId].nameVi = "FINAL // Overdrive Toi Da";
        UPGRADES[finId].descEs = "Requiere ULTIMATE. Cadencia maxima. Extremadamente caro.";
        UPGRADES[finId].descVi = "Can ULTIMATE. Toc do toi da. Cuc ky dat.";
    }
    if(group.upgrades.indexOf(ultId) < 0) group.upgrades.push(ultId);
    if(group.upgrades.indexOf(finId) < 0) group.upgrades.push(finId);
}

function ensureGroupReady(group){
    if(group == null) return;
    if(group._enriched){
        // still ensure ultimate/final/combo present
        try{ ensureUltimateFinalCards(group); }catch(e0){}
        try{ ensureComboMastery(group); }catch(eC0){}
        return;
    }
    try{
        ensureGroupEight(group);
        try{
            if(group.block != null) appendSignatureUpgrades(group, group.block());
        }catch(eS){}
        ensureUltimateFinalCards(group);
        try{ ensureComboMastery(group); }catch(eC1){}
    }catch(e){}
    group._enriched = true;
}

function canResearchUpgrade(u){
    if(u == null) return false;
    try{
        if(u.tier === "ultimate"){
            var b = u.block != null ? u.block() : null;
            return blockHasCombo(b);
        }
        if(u.tier === "final"){
            var b2 = u.block != null ? u.block() : null;
            return b2 != null && (levelOf(ultimateIdFor(b2))|0) >= 1;
        }
    }catch(e){}
    return true;
}

function canInstallTierGate(build, u){
    if(u == null) return true;
    try{
        if(u.tier === "ultimate") return blockHasCombo(build.block) && (levelOf(u.id)|0) > 0;
        if(u.tier === "final") return (levelOf(ultimateIdFor(build.block))|0) >= 1 && (levelOf(u.id)|0) > 0;
    }catch(e){}
    return true;
}

function tierStylePrefix(u){
    if(u == null) return "";
    if(u.tier === "ultimate"){
        var pulse = (Time != null && ((Time.time / 20)|0) % 2 === 0);
        return pulse ? "[#ffe082]◆ ULTIMATE ◆ " : "[#ffd54f]◆ ULTIMATE ◆ ";
    }
    if(u.tier === "final"){
        var p2 = (Time != null && ((Time.time / 15)|0) % 3);
        if(p2 === 0) return "[#ff5252]★ FINAL ★ ";
        if(p2 === 1) return "[#ffd740]★ FINAL ★ ";
        return "[#ea80fc]★ FINAL ★ ";
    }
    return "";
}


function autoMasterCost(blockFn, index, lv){
    var b = blockFn();
    var req = b != null ? b.requirements : null;
    var out = [];
    if(req != null && req.length > 0){
        var take = Math.min(4, req.length);
        for(var i = 0; i < take; i++){
            var r = req[(i + index) % req.length];
            if(r != null && r.item != null) out.push([r.item, Math.max(60, Math.floor(r.amount * (1.6 + index * 0.45)) + lv * (80 + index * 40))]);
        }
    }
    if(out.length === 0) out.push([Items.copper, 700 + index * 350 + lv * 250]);
    return out;
}


function classNameOf(obj){
    try{ return "" + obj.getClass().getSimpleName(); }catch(e){}
    try{ return "" + obj.getClass().getName(); }catch(e2){}
    return "";
}

function categoryOfBlock(b){
    if(b == null) return "production";
    try{
        var c = ("" + b.category).toLowerCase();
        if(c === "units") return "unit";
        if(CATEGORY_LABELS_EN[c] != null) return c;
    }catch(e){}
    return "production";
}

function currentPlanetObject(){
    try{
        if(Vars.state != null && Vars.state.rules != null){
            if(Vars.state.rules.planet != null) return Vars.state.rules.planet;
            try{
                if(Vars.state.rules.sector != null && Vars.state.rules.sector.planet != null)
                    return Vars.state.rules.sector.planet;
            }catch(eS){}
        }
    }catch(e){}
    try{
        if(Vars.ui != null && Vars.ui.planet != null){
            try{
                if(Vars.ui.planet.state != null && Vars.ui.planet.state.planet != null)
                    return Vars.ui.planet.state.planet;
            }catch(e1){}
            try{
                if(Vars.ui.planet.selected != null) return Vars.ui.planet.selected;
            }catch(e2){}
        }
    }catch(eU){}
    return null;
}

function blockVisibleNow(b){
    if(b == null) return false;
    try{ if(!b.logicVisible()) return false; }catch(e){}
    try{
        if(b.buildVisibility != null && !b.buildVisibility.visible()) return false;
    }catch(e2){}
    return true;
}

function isSunPlanet(p){
    try{
        if(p == null) return false;
        var n = ("" + (p.name != null ? p.name : "")).toLowerCase();
        // Sun = combined "any planet" view in campaign navigator
        return n === "sun" || n === "any" || n === "all";
    }catch(e){ return false; }
}

function blockOnCurrentPlanet(b){
    if(b == null) return false;
    var p = currentPlanetObject();
    // Sun / any => all planets. Null only shows all outside campaign.
    if(p != null && isSunPlanet(p)) return true;
    if(p == null){
        try{ if(!isCampaign()) return true; }catch(eN){ return true; }
        // Campaign without planet context: still try key heuristics below with empty
        return true;
    }
    var pn = "";
    try{ pn = ("" + p.name).toLowerCase(); }catch(e0){}
    if(pn === "" || pn === "custom") return true;

    // Prefer API if available
    try{ if(typeof b.isOnPlanet === "function" && b.isOnPlanet(p)) return true; }catch(eP){}

    try{
        var planets = b.shownPlanets;
        if(planets == null || planets.size <= 0){
            // Fall through to name key heuristic
        }else{
            try{ if(planets.contains(p)) return true; }catch(eC){}
            try{
                var it = planets.iterator();
                while(it.hasNext()){
                    var sp = it.next();
                    if(sp == null) continue;
                    if(isSunPlanet(sp)) return true;
                    try{
                        if((""+sp.name).toLowerCase() === pn) return true;
                    }catch(eNm){}
                }
            }catch(eIt){}
            // shownPlanets present but no match → not on this planet
            // still check key below for multi-planet edge cases
        }
    }catch(e){}

    // Name-key heuristic (serpulo / erekir / any)
    try{
        var key = planetKeyForBlock(b);
        if(key === "any" || key === "shared") return true;
        if((""+key).toLowerCase() === pn) return true;
        // If block has explicit shownPlanets that didn't match, hide
        try{
            var planets2 = b.shownPlanets;
            if(planets2 != null && planets2.size > 0) return false;
        }catch(e2){}
        // No shownPlanets: use category heuristics via planetKey only
        return key === "any" || (""+key).toLowerCase() === pn;
    }catch(e3){}
    return true;
}

function planetKeyForBlock(b){
    try{
        var planets = b.shownPlanets;
        if(planets != null && planets.size > 0){
            if(planets.size === 1){
                var p = planets.first();
                if(p != null && p.name != null){
                    var n = ("" + p.name).toLowerCase();
                    if(n === "sun") return "any";
                    return n;
                }
            }
            // Multi-planet → any
            return "any";
        }
    }catch(e){}
    // Heuristic by requirements / name when shownPlanets missing
    try{
        var nm = (""+b.name).toLowerCase();
        if(nm.indexOf("erekir") >= 0) return "erekir";
        var req = b.requirements;
        if(req != null){
            for(var i = 0; i < req.length; i++){
                var it = req[i] != null ? req[i].item : null;
                if(it == null) continue;
                var iname = (""+it.name).toLowerCase();
                if(iname === "beryllium" || iname === "tungsten" || iname === "oxide" || iname === "carbide") return "erekir";
            }
        }
    }catch(e2){}
    return "any";
}


function unitPlanetKey(u){
    if(u == null) return "any";
    try{
        // Explicit planet field when present
        if(u.planet != null && u.planet.name != null){
            var pn = ("" + u.planet.name).toLowerCase();
            if(pn === "sun") return "any";
            return pn;
        }
    }catch(e0){}
    // Cost / requirement heuristics for Erekir units
    try{
        var req = u.researchRequirements != null ? u.researchRequirements() : null;
        if(req != null){
            for(var i = 0; i < req.length; i++){
                var it = req[i].item;
                if(it == null) continue;
                var n = ("" + it.name).toLowerCase();
                if(n === "beryllium" || n === "tungsten" || n === "oxide" || n === "carbide" || n === "thorium"){
                    if(n === "beryllium" || n === "tungsten" || n === "oxide" || n === "carbide") return "erekir";
                }
            }
        }
    }catch(e1){}
    try{
        if(u.internalName != null){
            // no-op
        }
        var name = ("" + u.name).toLowerCase();
        // Common Erekir unit names
        var erekir = ["stell","locus","precept","vanquish","conquer","merui","cleroi","anthicus","tecta","collaris","elude","avert","obviate","quell","disrupt","renale","latum"];
        for(var k = 0; k < erekir.length; k++){
            if(name.indexOf(erekir[k]) >= 0) return "erekir";
        }
    }catch(e2){}
    return "serpulo";
}

function unitOnCurrentPlanet(u){
    if(u == null) return false;
    var p = currentPlanetObject();
    if(p == null || isSunPlanet(p)) return true;
    try{
        var pn = ("" + p.name).toLowerCase();
        if(pn === "" || pn === "custom") return true;
        var uk = unitPlanetKey(u);
        if(uk === "any") return true;
        return uk === pn;
    }catch(e){ return true; }
}

function planetLabelForBlock(b){
    var key = planetKeyForBlock(b);
    if(key === "any" || key === "shared") return tr("ANY PLANET", "QUALQUER PLANETA", "CUALQUIER PLANETA", "MỌI HÀNH TINH");
    try{
        var planets = b.shownPlanets;
        if(planets != null && planets.size === 1){
            var p = planets.first();
            if(p != null){
                try{ return ("" + p.localizedName).toUpperCase(); }catch(e){}
                return ("" + p.name).toUpperCase();
            }
        }
    }catch(e2){}
    return ("" + key).toUpperCase();
}

function isTransportBlock(b){
    if(b == null) return false;
    var n = "" + b.name;
    var c = classNameOf(b).toLowerCase();
    var ln = n.toLowerCase();
    return c.indexOf("conveyor") >= 0 || c.indexOf("duct") >= 0 || ln.indexOf("conveyor") >= 0 || ln.indexOf("duct") >= 0;
}

function blockProfile(b){
    var c = categoryOfBlock(b);
    var cls = classNameOf(b).toLowerCase();
    var n = b == null ? "" : ("" + b.name).toLowerCase();
    // Each index = a DIFFERENT role. names*: [en,pt,es,vi] arrays of 5
    function pack(names, descs, boosts, aim){
        return {
            kind: names.kind || "generic", category: c,
            namesEn: names.en, namesPt: names.pt, namesEs: names.es, namesVi: names.vi,
            descEn: descs.en, descPt: descs.pt, descEs: descs.es, descVi: descs.vi,
            boosts: boosts, aim: aim
        };
    }
    if(cls.indexOf("turret") >= 0) return pack(
        {kind:"turret",
            en:["Aim Assist", "Reload Timing", "Target Priority", "Recoil Brace", "Burst Window"],
            pt:["Ajuda de Mira", "Tempo de Recarga", "Prioridade de Alvo", "Trava de Recuo", "Janela de Rajada"],
            es:["Ayuda de Mira", "Tiempo de Recarga", "Prioridad de Blanco", "Freno de Retroceso", "Ventana de Ráfaga"],
            vi:["Hỗ trợ ngắm", "Nhịp nạp đạn", "Ưu tiên mục tiêu", "Chống giật", "Cửa sổ xả đạn"]},
        {en:["Turns toward enemies faster.", "Shortens time between shots.", "Locks the current target more firmly.", "Keeps the barrel steadier while firing.", "Improves the first shots of a fight."],
         pt:["Vira para o inimigo mais rápido.", "Diminui o tempo entre tiros.", "Mantém o alvo atual com mais firmeza.", "Mantém o cano mais firme ao atirar.", "Melhora os primeiros tiros do combate."],
         es:["Gira hacia el enemigo más rápido.", "Reduce el tiempo entre disparos.", "Mantiene mejor el blanco actual.", "Mantiene el cañón más firme al disparar.", "Mejora los primeros disparos del combate."],
         vi:["Xoay về địch nhanh hơn.", "Giảm thời gian giữa các phát.", "Giữ mục tiêu hiện tại chắc hơn.", "Nòng súng ổn định hơn khi bắn.", "Cải thiện các phát đầu trận."]},
        [0.08, 0.07, 0.06, 0.075, 0.09], [0.15, 0.10, 0.12, 0.18, 0.13]
    );
    if(cls.indexOf("drill") >= 0 || n.indexOf("drill") >= 0) return pack(
        {kind:"drill",
            en:["Sharper Bit", "Stable Bore", "Motor Tune", "Ore Chute", "Deep Push"],
            pt:["Broca Mais Afiada", "Furo Estável", "Ajuste do Motor", "Calha de Minério", "Empurrão Profundo"],
            es:["Broca más Afilada", "Perforación Estable", "Ajuste del Motor", "Tolva de Mineral", "Empuje Profundo"],
            vi:["Mũi khoan sắc", "Lỗ khoan ổn định", "Chỉnh động cơ", "Máng quặng", "Đẩy sâu hơn"]},
        {en:["Mines a bit faster.", "Fewer stalled dig cycles.", "Smoother power to the bit.", "Moves ore out of the drill quicker.", "Raises sustained mining speed."],
         pt:["Mina um pouco mais rápido.", "Menos ciclos de escavação parados.", "Potência mais estável na broca.", "Tira o minério da broca mais rápido.", "Aumenta a velocidade de mineração."],
         es:["Mina un poco más rápido.", "Menos ciclos de excavación detenidos.", "Potencia más estable en la broca.", "Saca el mineral más rápido.", "Sube la velocidad de minado."],
         vi:["Đào nhanh hơn một chút.", "Ít chu kỳ đào bị đứng.", "Công suất mũi khoan ổn định hơn.", "Đưa quặng ra nhanh hơn.", "Tăng tốc độ đào bền vững."]},
        [0.11, 0.09, 0.08, 0.07, 0.12], null
    );
    if(cls.indexOf("conveyor") >= 0 || cls.indexOf("duct") >= 0 || c === "distribution") return pack(
        {kind:"distribution",
            en:["Smoother Rollers", "Centered Path", "Gap Control", "Short Buffer", "Line Capacity"],
            pt:["Rolos Mais Lisos", "Caminho Central", "Controle de Espaço", "Buffer Curto", "Capacidade da Linha"],
            es:["Rodillos más Suaves", "Ruta Centrada", "Control de Huecos", "Búfer Corto", "Capacidad de Línea"],
            vi:["Con lăn mượt", "Làn giữa", "Giảm kẹt", "Bộ đệm ngắn", "Công suất dây chuyền"]},
        {en:["Items stutter less on the belt.", "Keeps cargo in the middle of the lane.", "Reduces pile-ups at merges.", "Absorbs short traffic spikes.", "Higher sustained item flow."],
         pt:["Itens engasgam menos na esteira.", "Mantém a carga no meio da faixa.", "Reduz filas em cruzamentos.", "Aguenta picos curtos de tráfego.", "Maior fluxo contínuo de itens."],
         es:["Los ítems traban menos en la cinta.", "Mantiene la carga al centro.", "Reduce atascos en cruces.", "Aguanta picos cortos de tráfico.", "Mayor flujo continuo de ítems."],
         vi:["Ít bị khựng trên băng tải.", "Giữ hàng ở giữa làn.", "Giảm tắc ở điểm giao.", "Chịu được sóng tải ngắn.", "Tăng lưu lượng hàng ổn định."]},
        [0.09, 0.08, 0.07, 0.085, 0.11], null
    );
    if(cls.indexOf("pump") >= 0 || cls.indexOf("conduit") >= 0 || cls.indexOf("liquid") >= 0 || c === "liquid") return pack(
        {kind:"liquid",
            en:["Faster Intake", "Clean Valves", "Tank Leveling", "Soft Pressure", "Peak Flow"],
            pt:["Entrada Mais Rápida", "Válvulas Limpas", "Nível do Tanque", "Pressão Suave", "Fluxo Máximo"],
            es:["Entrada más Rápida", "Válvulas Limpias", "Nivel del Tanque", "Presión Suave", "Flujo Máximo"],
            vi:["Hút nhanh hơn", "Van sạch", "Cân bằng bồn", "Áp suất êm", "Dòng đỉnh"]},
        {en:["Pulls liquid in faster.", "Valves open/close more cleanly.", "Internal storage stays balanced.", "Fewer pressure spikes.", "Higher sustained liquid throughput."],
         pt:["Puxa líquido mais rápido.", "Válvulas abrem/fecham melhor.", "Estoque interno fica equilibrado.", "Menos picos de pressão.", "Maior fluxo contínuo de líquido."],
         es:["Aspira líquido más rápido.", "Las válvulas abren/cierran mejor.", "El tanque interno se equilibra.", "Menos picos de presión.", "Mayor flujo continuo de líquido."],
         vi:["Hút chất lỏng nhanh hơn.", "Van mở/đóng mượt hơn.", "Bồn trong ổn định hơn.", "Ít đột biến áp suất.", "Tăng lưu lượng chất lỏng."]},
        [0.10, 0.075, 0.07, 0.085, 0.11], null
    );
    if(cls.indexOf("factory") >= 0 || cls.indexOf("crafter") >= 0 || c === "production" || c === "crafting") return pack(
        {kind:"factory",
            en:["Cleaner Feed", "Shorter Cycle", "Heat Control", "Faster Output", "Plant Overdrive"],
            pt:["Carga Mais Limpa", "Ciclo Mais Curto", "Controle de Calor", "Saída Mais Rápida", "Overdrive da Planta"],
            es:["Carga más Limpia", "Ciclo más Corto", "Control de Calor", "Salida más Rápida", "Overdrive de Planta"],
            vi:["Nạp sạch hơn", "Chu kỳ ngắn hơn", "Kiểm soát nhiệt", "Xuất nhanh hơn", "Tăng tốc nhà máy"]},
        {en:["Inputs start crafts more reliably.", "Less waiting between crafts.", "Keeps process heat useful.", "Finished items leave faster.", "Raises sustained craft speed."],
         pt:["Entradas iniciam crafts com mais certeza.", "Menos espera entre crafts.", "Mantém o calor útil no processo.", "Itens prontos saem mais rápido.", "Aumenta a velocidade de craft."],
         es:["Las entradas inician crafts con más certeza.", "Menos espera entre crafts.", "Mantiene el calor útil.", "Los ítems listos salen más rápido.", "Sube la velocidad de craft."],
         vi:["Nguyên liệu vào ổn định hơn.", "Ít chờ giữa các mẻ.", "Giữ nhiệt trong vùng hữu ích.", "Hàng xong ra nhanh hơn.", "Tăng tốc độ chế tạo."]},
        [0.09, 0.08, 0.075, 0.085, 0.105], null
    );
    if(cls.indexOf("unitfactory") >= 0 || cls.indexOf("reconstructor") >= 0 || c === "unit") return pack(
        {kind:"unit",
            en:["Frame Align", "Servo Step", "Part Feed", "Build Tolerance", "Yard Overdrive"],
            pt:["Alinha Estrutura", "Passo do Servo", "Carga de Peças", "Tolerância de Montagem", "Overdrive do Pátio"],
            es:["Alineación de Bastidor", "Paso del Servo", "Carga de Piezas", "Tolerancia de Montaje", "Overdrive del Patio"],
            vi:["Canh khung", "Bước servo", "Nạp linh kiện", "Dung sai lắp", "Tăng tốc xưởng"]},
        {en:["Assembly steps line up better.", "Less delay between build stages.", "Parts arrive more steadily.", "Tighter reconstruction accuracy.", "Faster sustained unit production."],
         pt:["Etapas de montagem alinham melhor.", "Menos atraso entre estágios.", "Peças chegam com mais constância.", "Reconstrução mais precisa.", "Produz unidades mais rápido."],
         es:["Los pasos de montaje alinean mejor.", "Menos retraso entre etapas.", "Las piezas llegan más constantes.", "Reconstrucción más precisa.", "Produce unidades más rápido."],
         vi:["Các bước lắp khớp hơn.", "Ít trễ giữa các giai đoạn.", "Linh kiện vào đều hơn.", "Tái tạo chính xác hơn.", "Sản xuất unit nhanh hơn."]},
        [0.09, 0.075, 0.08, 0.085, 0.105], null
    );
    if(cls.indexOf("power") >= 0 || c === "power") return pack(
        {kind:"power",
            en:["Coil Efficiency", "Grid Link", "Spike Guard", "Stable Output", "Power Push"],
            pt:["Eficiência das Bobinas", "Ligação à Rede", "Proteção de Pico", "Saída Estável", "Empurrão de Energia"],
            es:["Eficiencia de Bobinas", "Enlace a la Red", "Protección de Picos", "Salida Estable", "Empuje de Energía"],
            vi:["Hiệu suất cuộn", "Nối lưới", "Chống đột biến", "Đầu ra ổn", "Đẩy công suất"]},
        {en:["Slightly better energy conversion.", "Cleaner connection to the grid.", "Softens sudden power spikes.", "More stable continuous output.", "Higher sustained power throughput."],
         pt:["Conversão de energia um pouco melhor.", "Ligação mais limpa à rede.", "Suaviza picos súbitos de energia.", "Saída contínua mais estável.", "Maior vazão de energia."],
         es:["Mejor conversión de energía.", "Conexión más limpia a la red.", "Suaviza picos súbitos.", "Salida continua más estable.", "Mayor caudal de energía."],
         vi:["Chuyển đổi năng lượng tốt hơn.", "Kết nối lưới sạch hơn.", "Làm mượt đột biến điện.", "Đầu ra ổn định hơn.", "Tăng công suất liên tục."]},
        [0.08, 0.07, 0.075, 0.08, 0.10], null
    );
    if(c === "defense") return pack(
        {kind:"defense",
            en:["Plate Bond", "Impact Spread", "Stress Share", "Ablative Skin", "Hold Fast"],
            pt:["União das Placas", "Espalha Impacto", "Divide Tensão", "Pele Ablativa", "Aguenta Firme"],
            es:["Unión de Placas", "Reparto de Impacto", "Comparte Tensión", "Piel Ablativa", "Resiste Firme"],
            vi:["Liên kết tấm", "Phân tán va đập", "Chia tải", "Lớp hy sinh", "Giữ vững"]},
        {en:["Plates stay joined under fire.", "Spreads hits across the wall.", "Shares stress with neighbors.", "Outer layer eats the first hits.", "Max structural hold under pressure."],
         pt:["Placas ficam unidas sob fogo.", "Espalha os hits pela parede.", "Divide a tensão com vizinhos.", "Camada externa leva os primeiros hits.", "Máxima firmeza sob pressão."],
         es:["Las placas se mantienen unidas.", "Reparte los golpes en el muro.", "Comparte tensión con vecinos.", "La capa externa absorbe los primeros golpes.", "Máxima firmeza bajo presión."],
         vi:["Tấm vẫn dính khi bị bắn.", "Trải sát thương trên tường.", "Chia lực với ô bên cạnh.", "Lớp ngoài chịu đòn đầu.", "Giữ kết cấu tối đa."]},
        [0.07, 0.08, 0.07, 0.085, 0.09], null
    );
    if(c === "effect") return pack(
        {kind:"effect",
            en:["Field Focus", "Projector Sync", "Edge Coverage", "Pulse Strength", "Support Push"],
            pt:["Foco de Campo", "Sync do Projetor", "Cobertura da Borda", "Força do Pulso", "Empurrão de Suporte"],
            es:["Foco de Campo", "Sincronía del Proyector", "Cobertura del Borde", "Fuerza del Pulso", "Empuje de Soporte"],
            vi:["Tập trung trường", "Đồng bộ máy chiếu", "Phủ mép", "Cường độ xung", "Đẩy hỗ trợ"]},
        {en:["Support field is tighter.", "Projector cycles stay in sync.", "Coverage edge is cleaner.", "Stronger support pulses.", "Higher sustained support effect."],
         pt:["Campo de suporte mais firme.", "Ciclos do projetor ficam sincronizados.", "Borda da cobertura mais limpa.", "Pulsos de suporte mais fortes.", "Efeito de suporte mais constante."],
         es:["Campo de soporte más firme.", "Los ciclos del proyector se sincronizan.", "Borde de cobertura más limpio.", "Pulsos de soporte más fuertes.", "Efecto de soporte más constante."],
         vi:["Trường hỗ trợ chặt hơn.", "Chu kỳ máy chiếu khớp hơn.", "Mép vùng phủ sạch hơn.", "Xung hỗ trợ mạnh hơn.", "Hiệu ứng hỗ trợ ổn định hơn."]},
        [0.08, 0.075, 0.07, 0.085, 0.10], null
    );
    if(c === "logic") return pack(
        {kind:"logic",
            en:["Clock Trim", "Instruction Path", "Memory Clean", "Bus Cool", "Logic Push"],
            pt:["Ajuste de Clock", "Caminho da Instrução", "Memória Limpa", "Bus Frio", "Empurrão Lógico"],
            es:["Ajuste de Reloj", "Ruta de Instrucción", "Memoria Limpia", "Bus Fresco", "Empuje Lógico"],
            vi:["Chỉnh xung nhịp", "Đường lệnh", "Bộ nhớ sạch", "Bus mát", "Đẩy logic"]},
        {en:["Processor clock runs cleaner.", "Instructions wait less in queue.", "Memory access is tidier.", "Bus stays cooler under load.", "Higher sustained logic throughput."],
         pt:["Clock do processador mais limpo.", "Instruções esperam menos na fila.", "Acesso à memória mais organizado.", "Bus esquenta menos sob carga.", "Maior vazão lógica."],
         es:["El reloj del procesador es más limpio.", "Las instrucciones esperan menos.", "El acceso a memoria es más ordenado.", "El bus se calienta menos.", "Mayor caudal lógico."],
         vi:["Xung nhịp CPU sạch hơn.", "Lệnh chờ hàng đợi ít hơn.", "Truy cập bộ nhớ gọn hơn.", "Bus nóng ít hơn khi tải.", "Tăng thông lượng logic."]},
        [0.07, 0.08, 0.07, 0.075, 0.09], null
    );
    return pack(
        {kind:"generic",
            en:["Cycle Tune", "Load Balance", "Faster Response", "Less Idle", "System Push"],
            pt:["Ajuste de Ciclo", "Balance de Carga", "Resposta Mais Rápida", "Menos Ocio", "Empurrão do Sistema"],
            es:["Ajuste de Ciclo", "Balance de Carga", "Respuesta más Rápida", "Menos Inactivo", "Empuje del Sistema"],
            vi:["Chỉnh chu kỳ", "Cân bằng tải", "Phản hồi nhanh", "Ít chờ", "Đẩy hệ thống"]},
        {en:["Main cycle runs cleaner.", "Balances internal load.", "Responds a bit faster.", "Wastes fewer idle ticks.", "Higher sustained performance."],
         pt:["Ciclo principal mais limpo.", "Equilibra a carga interna.", "Responde um pouco mais rápido.", "Desperdiça menos ticks ociosos.", "Desempenho contínuo maior."],
         es:["El ciclo principal es más limpio.", "Equilibra la carga interna.", "Responde un poco más rápido.", "Desperdicia menos ticks inactivos.", "Mayor rendimiento continuo."],
         vi:["Chu kỳ chính mượt hơn.", "Cân bằng tải nội bộ.", "Phản hồi nhanh hơn một chút.", "Ít tick chờ lãng phí.", "Hiệu năng ổn định cao hơn."]},
        [0.08, 0.07, 0.075, 0.08, 0.10], null
    );
}

function blockCardName(b, profile, index){
    var loc = "Block";
    try{ if(b != null && b.localizedName != null) loc = "" + b.localizedName; }catch(e){}
    var short = loc.length > 18 ? loc.substring(0, 16) + "..." : loc;
    var nEn = (profile && profile.namesEn && profile.namesEn[index]) ? profile.namesEn[index] : ("Core " + (index + 1));
    var nPt = (profile && profile.namesPt && profile.namesPt[index]) ? profile.namesPt[index] : ("Principal " + (index + 1));
    var nEs = (profile && profile.namesEs && profile.namesEs[index]) ? profile.namesEs[index] : nEn;
    var nVi = (profile && profile.namesVi && profile.namesVi[index]) ? profile.namesVi[index] : nEn;
    return {
        en: short + " — " + nEn,
        pt: short + " — " + nPt,
        es: short + " — " + nEs,
        vi: short + " — " + nVi
    };
}

function upgradeNames(category, index, block){
    var profile = blockProfile(block);
    return blockCardName(block, profile, index);
}

function blockUpgradeContext(block){
    if(block == null) return "";
    var cls = classNameOf(block).toLowerCase();
    try{
        if((categoryOfBlock(block) === "crafting" || cls.indexOf("crafter") >= 0) && block.outputItem != null){
            return "Output: " + block.outputItem.item.localizedName + " x" + block.outputItem.amount;
        }
    }catch(e1){}
    try{
        if(cls.indexOf("turret") >= 0 && block.ammoTypes != null){
            return "Ammo profiles: " + block.ammoTypes.size;
        }
    }catch(e2){}
    try{
        if(categoryOfBlock(block) === "defense") return "Health: " + Math.round(block.health);
    }catch(e3){}
    try{
        if(categoryOfBlock(block) === "power" && block.powerProduction != null) return "Power output: " + block.powerProduction;
    }catch(e4){}
    try{
        if(block.size != null) return "Size: " + block.size + "x" + block.size;
    }catch(e5){}
    return "System: " + (block.localizedName != null ? block.localizedName : block.name);
}

function upgradeDescription(category, level, block, index){
    var profile = blockProfile(block);
    var pct = Math.round((profile.boosts[index] || 0.07) * 100);
    var en = (profile.descEn && profile.descEn[index]) ? profile.descEn[index] : "Improves this block.";
    var pt = (profile.descPt && profile.descPt[index]) ? profile.descPt[index] : "Melhora este bloco.";
    var es = (profile.descEs && profile.descEs[index]) ? profile.descEs[index] : en;
    var vi = (profile.descVi && profile.descVi[index]) ? profile.descVi[index] : en;
    var ctx = blockUpgradeContext(block);
    return tr(en + " (+" + pct + "% / rank) // " + ctx, pt + " (+" + pct + "% / nível) // " + ctx, es + " (+" + pct + "% / nivel) // " + ctx, vi + " (+" + pct + "% / cấp) // " + ctx);
}

function genericUpgradeId(blockName, index){
    return "auto-" + safePart(blockName) + "-" + (index + 1);
}

function pushUniqueResource(list, mode, resource){
    if(resource == null) return;
    var id = resource.id == null ? ("" + resource) : ("" + resource.id);
    for(var i = 0; i < list.length; i++){
        if(list[i].mode === mode && list[i].resource != null){
            var oldId = list[i].resource.id == null ? ("" + list[i].resource) : ("" + list[i].resource.id);
            if(oldId === id) return;
        }
    }
    list.push({mode:mode, resource:resource});
}

function acceptedConditionResources(block){
    var out = [];
    if(block == null) return out;

    // Turrets expose the resources they can actually fire with through ammoTypes.
    try{
        var ammo = block.ammoTypes;
        if(ammo != null && ammo.entries != null){
            ammo.entries().each(function(entry){
                try{ pushUniqueResource(out, classNameOf(block).toLowerCase().indexOf("liquid") >= 0 ? "liquid" : "item", entry.key); }catch(e){}
            });
        }
    }catch(e){}

    // Read real consumers. Do not fall back to build requirements: that was the source of
    // impossible conditions such as asking a turret to receive lead when lead is not ammo.
    try{
        var consumers = block.consumers;
        if(consumers != null){
            for(var i = 0; i < consumers.length; i++){
                var c = consumers[i];
                if(c == null) continue;
                var cn = classNameOf(c).toLowerCase();
                if(cn.indexOf("consumeliquid") >= 0){
                    try{ if(c.liquid != null) pushUniqueResource(out, "liquid", c.liquid); }catch(e1){}
                    try{
                        if(c.liquids != null){
                            for(var l = 0; l < c.liquids.length; l++){
                                var ls = c.liquids[l];
                                if(ls != null && ls.liquid != null) pushUniqueResource(out, "liquid", ls.liquid);
                            }
                        }
                    }catch(e2){}
                }
                if(cn.indexOf("consumeitem") >= 0){
                    try{ if(c.item != null) pushUniqueResource(out, "item", c.item); }catch(e3){}
                    try{
                        if(c.items != null){
                            for(var q = 0; q < c.items.length; q++){
                                var st = c.items[q];
                                if(st != null && st.item != null) pushUniqueResource(out, "item", st.item);
                            }
                        }
                    }catch(e4){}
                }
            }
        }
    }catch(e5){}

    // Some blocks expose explicit filters instead of ConsumerItem entries.
    try{
        if(block.itemFilter != null && Vars.content != null && Vars.content.items != null){
            Vars.content.items().each(function(item){
                try{ if(item != null && item.id != null && block.itemFilter[item.id]) pushUniqueResource(out, "item", item); }catch(e){}
            });
        }
    }catch(e6){}
    try{
        if(block.liquidFilter != null && Vars.content != null && Vars.content.liquids != null){
            Vars.content.liquids().each(function(liquid){
                try{ if(liquid != null && liquid.id != null && block.liquidFilter[liquid.id]) pushUniqueResource(out, "liquid", liquid); }catch(e){}
            });
        }
    }catch(e7){}
    return out;
}

function hasPowerInput(block){
    if(block == null) return false;
    try{
        var consumers = block.consumers;
        if(consumers != null){
            for(var i = 0; i < consumers.length; i++){
                var c = consumers[i];
                if(c != null && classNameOf(c).toLowerCase().indexOf("consumepower") >= 0) return true;
            }
        }
    }catch(e){}
    try{ return !!(block.hasPower && !block.outputsPower && block.consPower != null); }catch(e2){}
    return false;
}

function isFactoryLike(block){
    if(block == null) return false;
    var cls = classNameOf(block).toLowerCase();
    return categoryOfBlock(block) === "crafting" || cls.indexOf("crafter") >= 0 || cls.indexOf("press") >= 0 || cls.indexOf("smelter") >= 0 || cls.indexOf("mixer") >= 0 || cls.indexOf("furnace") >= 0;
}

function factoryRecipeSpec(block, resource, slot){
    if(!isFactoryLike(block) || resource == null) return null;
    var outItem = null, outAmount = 0;
    try{
        if(block.outputItem != null && block.outputItem.item != null){
            outItem = block.outputItem.item;
            outAmount = block.outputItem.amount|0;
        }else if(block.outputItems != null && block.outputItems.length > 0 && block.outputItems[0] != null){
            outItem = block.outputItems[0].item;
            outAmount = block.outputItems[0].amount|0;
        }
    }catch(e){}
    if(outItem == null || outAmount <= 0) return null;
    var baseInput = 0;
    try{
        var consumers = block.consumers;
        if(consumers != null){
            for(var i = 0; i < consumers.length; i++){
                var c = consumers[i];
                if(c == null || classNameOf(c).toLowerCase().indexOf("consumeitems") < 0 || c.items == null) continue;
                var arr = c.items;
                var len = arr.length != null ? arr.length : (arr.size != null ? arr.size : 0);
                for(var j = 0; j < len; j++){
                    var st = arr[j];
                    if(st == null && arr.get != null) st = arr.get(j);
                    if(st != null && st.item === resource){ baseInput = st.amount|0; break; }
                }
                if(baseInput > 0) break;
            }
        }
    }catch(e2){}
    if(baseInput <= 0) return null;
    var boostedInput = baseInput + 2;
    var boostedOutput = outAmount + 2;
    return {input:resource, baseInput:baseInput, boostedInput:boostedInput, output:outItem, baseOutput:outAmount, boostedOutput:boostedOutput, extraInput:boostedInput-baseInput, extraOutput:boostedOutput-outAmount, slot:slot};
}

function conditionSpecForBlock(block, slot){
    var resources = acceptedConditionResources(block);
    if(resources[slot] != null){
        var spec = resources[slot];
        var recipe = factoryRecipeSpec(block, spec.resource, slot);
        if(recipe != null) spec.recipe = recipe;
        return spec;
    }
    // Add power only after all real item/liquid inputs have been used, and only once.
    if(slot === resources.length && hasPowerInput(block)) return {mode:'power'};
    return null;
}

function availableConditionSpecs(block){
    var out = [];
    if(block == null) return out;
    var max = 8;
    for(var i = 0; i < max; i++){
        var spec = conditionSpecForBlock(block, i);
        if(spec == null) break;
        out.push(spec);
    }
    return out;
}

function conditionText(spec){
    if(spec == null) return {en:'', pt:'', es:'', vi:''};
    if(spec.mode === 'liquid'){
        var ln = spec.resource != null ? spec.resource.localizedName : 'liquid';
        return {
            en:'Needs ' + ln + ' stored inside.',
            pt:'Precisa de ' + ln + ' guardado dentro.',
            es:'Necesita ' + ln + ' guardado dentro.',
            vi:'Cần có ' + ln + ' bên trong.'
        };
    }
    if(spec.mode === 'item'){
        var inn = spec.resource != null ? spec.resource.localizedName : 'item';
        if(spec.recipe != null){
            var rin = spec.recipe.input.localizedName;
            var rout = spec.recipe.output.localizedName;
            return {
                en:'Factory condition: keep ' + rin + ' available. Recipe becomes ' + spec.recipe.boostedInput + ' ' + rin + ' → ' + spec.recipe.boostedOutput + ' ' + rout + '.',
                pt:'Condição da fábrica: mantenha ' + rin + ' disponível. A receita passa a ser ' + spec.recipe.boostedInput + ' ' + rin + ' → ' + spec.recipe.boostedOutput + ' ' + rout + '.',
                es:'Condición de fábrica: mantén ' + rin + ' disponible. La receta pasa a ser ' + spec.recipe.boostedInput + ' ' + rin + ' → ' + spec.recipe.boostedOutput + ' ' + rout + '.',
                vi:'Điều kiện nhà máy: cần có ' + rin + '. Công thức trở thành ' + spec.recipe.boostedInput + ' ' + rin + ' → ' + spec.recipe.boostedOutput + ' ' + rout + '.'
            };
        }
        return {
            en:'Needs ' + inn + ' loaded as ammo/input.',
            pt:'Precisa de ' + inn + ' carregado como munição/entrada.',
            es:'Necesita ' + inn + ' cargado como munición/entrada.',
            vi:'Cần nạp ' + inn + ' làm đạn/đầu vào.'
        };
    }
    return {
        en:'Needs stable power connected.',
        pt:'Precisa de energia estável ligada.',
        es:'Necesita energía estable conectada.',
        vi:'Cần nguồn điện ổn định.'
    };
}

function turretHasItem(build, item){
    try{
        if(item == null || build == null || build.ammo == null) return false;
        for(var i = 0; i < build.ammo.size; i++){
            var entry = build.ammo.get(i);
            if(entry != null && entry.item === item && entry.amount > 0) return true;
        }
    }catch(e){}
    return false;
}

function conditionSatisfied(build, u){
    if(build == null || u == null || !u.conditional) return true;
    var spec = u.condition;
    if(spec == null || spec.mode === 'none') return false;
    try{
        if(spec.mode === 'power'){
            return build.power != null && build.power.status >= 0.90;
        }
        if(spec.mode === 'liquid'){
            return build.liquids != null && spec.resource != null && build.liquids.get(spec.resource) >= 0.1;
        }
        if(spec.mode === 'item'){
            if(spec.resource == null) return false;
            var cls = classNameOf(build.block).toLowerCase();
            if(cls.indexOf('itemturret') >= 0 || cls.indexOf('turret') >= 0){
                return turretHasItem(build, spec.resource);
            }
            try{
                if(build.items != null && build.block != null && build.block.itemCapacity > 0){
                    return build.items.get(spec.resource) >= 1;
                }
            }catch(e2){}
            return false;
        }
    }catch(e){}
    return false;
}

function conditionStatusText(build, u){
    if(u == null || !u.conditional) return '';
    if(u.condition == null) return '';
    var ok = conditionSatisfied(build, u);
    return ok
        ? tr('CONDITION ACTIVE // BOOST ENABLED', 'CONDICAO ATIVA // BOOST HABILITADO')
        : tr('CONDITION NOT MET // BOOST PAUSED', 'CONDICAO NAO ATENDIDA // BOOST PAUSADO');
}

function makeConditionalUp(id, blockFn, costFn, nameEn, namePt, spec, keys){
    var u = makeUp(id, blockFn, 1, costFn, nameEn, namePt, '', '', keys);
    u.conditional = true;
    u.condition = spec;
    u.boostEach = 0.06;
    var ct = conditionText(spec);
    u.descEn = 'Active while condition is met. +' + Math.round(u.boostEach * 100) + '% efficiency. ' + ct.en;
    u.descPt = 'Ativo enquanto a condição for atendida. +' + Math.round(u.boostEach * 100) + '% eficiência. ' + ct.pt;
    u.descEs = 'Activo mientras se cumple la condición. +' + Math.round(u.boostEach * 100) + '% eficiencia. ' + ct.es;
    u.descVi = 'Hoạt động khi điều kiện được đáp ứng. +' + Math.round(u.boostEach * 100) + '% hiệu suất. ' + ct.vi;
    u.desc = function(lv){ return tr(this.descEn, this.descPt, this.descEs, this.descVi); };
    return u;
}

function conditionalNames(block, index, spec){
    var resource = spec != null && spec.resource != null ? ("" + spec.resource.localizedName) : "";
    var mode = spec == null ? "none" : spec.mode;
    var loc = "Block";
    try{ if(block != null && block.localizedName != null) loc = "" + block.localizedName; }catch(e){}
    var short = loc.length > 14 ? loc.substring(0, 12) + "..." : loc;

    var pools = {
        liquid: {
            en:["Needs Liquid", "Pressure Check", "Reservoir Link", "Wet Circuit", "Flow Gate", "Sump Sensor", "Hydraulic Key", "Liquid Latch"],
            pt:["Precisa de Líquido", "Checagem de Pressão", "Elo do Reservatório", "Circuito Molhado", "Portão de Fluxo", "Sensor do Poço", "Chave Hidráulica", "Trava de Líquido"],
            es:["Necesita Líquido", "Chequeo de Presión", "Enlace de Reservorio", "Circuito Húmedo", "Compuerta de Flujo", "Sensor de Pozo", "Llave Hidráulica", "Pestillo de Líquido"],
            vi:["Cần chất lỏng", "Kiểm tra áp suất", "Liên kết bồn", "Mạch ướt", "Cổng dòng", "Cảm biến hố", "Chìa thủy lực", "Chốt chất lỏng"]
        },
        item: {
            en:["Needs Ammo/Item", "Magazine Check", "Feed Sensor", "Cargo Key", "Hopper Link", "Stock Gate", "Loaded Latch", "Supply Circuit"],
            pt:["Precisa de Munição/Item", "Checagem do Magazine", "Sensor de Carga", "Chave de Carga", "Elo do Hopper", "Portão de Estoque", "Trava Carregada", "Circuito de Suprimento"],
            es:["Necesita Munición/Ítem", "Chequeo de Cargador", "Sensor de Carga", "Llave de Carga", "Enlace de Tolva", "Compuerta de Stock", "Pestillo Cargado", "Circuito de Suministro"],
            vi:["Cần đạn/vật phẩm", "Kiểm tra băng đạn", "Cảm biến nạp", "Chìa hàng", "Liên kết phễu", "Cổng kho", "Chốt đã nạp", "Mạch tiếp tế"]
        },
        power: {
            en:["Needs Power", "Grid Check", "Live Wire", "Watt Sensor", "Bus Key", "Charge Gate", "Voltage Latch", "Network Link"],
            pt:["Precisa de Energia", "Checagem da Rede", "Fio Ao Vivo", "Sensor de Watts", "Chave do Bus", "Portão de Carga", "Trava de Tensão", "Elo da Rede"],
            es:["Necesita Energía", "Chequeo de Red", "Cable Vivo", "Sensor de Vatios", "Llave del Bus", "Compuerta de Carga", "Pestillo de Voltaje", "Enlace de Red"],
            vi:["Cần điện", "Kiểm tra lưới", "Dây có điện", "Cảm biến watt", "Chìa bus", "Cổng sạc", "Chốt điện áp", "Liên kết mạng"]
        },
        none: {
            en:["Ambient Check", "Field Sensor", "Context Key", "Standby Gate", "Presence Latch", "Local Link", "Soft Condition", "Idle Circuit"],
            pt:["Checagem Ambiente", "Sensor de Campo", "Chave de Contexto", "Portão em Espera", "Trava de Presença", "Elo Local", "Condição Suave", "Circuito Ocioso"],
            es:["Chequeo Ambiental", "Sensor de Campo", "Llave de Contexto", "Compuerta en Espera", "Pestillo de Presencia", "Enlace Local", "Condición Suave", "Circuito Inactivo"],
            vi:["Kiểm tra môi trường", "Cảm biến trường", "Chìa ngữ cảnh", "Cổng chờ", "Chốt hiện diện", "Liên kết cục bộ", "Điều kiện mềm", "Mạch chờ"]
        }
    };
    var pool = pools[mode] || pools.none;
    var i = index % pool.en.length;
    var suffix = resource ? (" · " + resource) : "";
    if(spec != null && spec.recipe != null){
        suffix += " · " + spec.recipe.boostedInput + "→" + spec.recipe.boostedOutput;
    }
    return {
        en: short + " — " + pool.en[i] + suffix,
        pt: short + " — " + pool.pt[i] + suffix,
        es: short + " — " + pool.es[i] + suffix,
        vi: short + " — " + pool.vi[i] + suffix
    };
}

function ensureGroupEight(group){
    if(group == null) return;
    var b = group.block();
    if(b == null) return;
    var category = group.category || categoryOfBlock(b);
    group.category = category;
    if(group.upgrades == null) group.upgrades = [];

    var seed = blockSeed(b.name);
    var coreN = rangeCount(seed, 2, 5);           // 2-5 core upgrades
    var availableConds = availableConditionSpecs(b);
    var condN = Math.min(4, availableConds.length); // only real conditions, max 4 for a cleaner UI
    group.coreCount = coreN;
    group.condCount = condN;
    var layout = "v4-" + coreN + "x" + condN;
    var target = coreN + condN;

    if(group.upgrades.length !== target || group._cardLayout !== layout){
        group.upgrades = [];
        group._cardLayout = layout;
        for(var idx = 0; idx < coreN; idx++){
            var names = upgradeNames(category, idx, b);
            var id = genericUpgradeId("" + b.name, idx);
            if(UPGRADES[id] == null){
                UPGRADES[id] = makeUp(id, group.block, 3,
                    (function(blockFn, costIndex){ return function(lv){ return autoCost(blockFn, costIndex, lv); }; })(group.block, idx),
                    names.en, names.pt, "", "", "" + b.name + " " + category + " upgrade improvement speed");
            }
            // Real gameplay effect sizes by category (testers: capacity-only felt useless)
            try{
                var be = 0.10;
                if(category === "power") be = 0.16;
                else if(category === "crafting") be = 0.12;
                else if(category === "production") be = 0.14;
                else if(category === "turret") be = 0.11;
                else if(category === "defense") be = 0.08;
                UPGRADES[id].boostEach = be;
                UPGRADES[id].effectKind =
                    category === "power" ? "power" :
                    category === "crafting" ? "craft" :
                    category === "production" ? "mine" :
                    category === "turret" ? "turret" : "generic";
            }catch(eBe){}
            // Always refresh titles/descriptions (unique per role + language)
            UPGRADES[id].nameEn = names.en;
            UPGRADES[id].namePt = names.pt || names.en;
            UPGRADES[id].nameEs = names.es || names.en;
            UPGRADES[id].nameVi = names.vi || names.en;
            (function(up, cat, blk, ix){
                up.desc = function(lv){ return upgradeDescription(cat, lv, blk, ix); };
            })(UPGRADES[id], category, b, idx);
            group.upgrades.push(id);
        }
        for(var cidx = 0; cidx < condN; cidx++){
            var cid = genericUpgradeId("" + b.name, coreN + cidx);
            var spec = availableConds[cidx];
            if(spec == null) continue;
            var cn = conditionalNames(b, cidx, spec);
            if(UPGRADES[cid] == null){
                UPGRADES[cid] = makeConditionalUp(cid, group.block,
                    (function(blockFn, costIndex){ return function(lv){ return autoCost(blockFn, costIndex + 3, lv); }; })(group.block, cidx),
                    cn.en, cn.pt, spec, "" + b.name + " conditional " + category + " requirement");
            }
            // Refresh conditional titles/descriptions
            UPGRADES[cid].nameEn = cn.en;
            UPGRADES[cid].namePt = cn.pt;
            UPGRADES[cid].nameEs = cn.es || cn.en;
            UPGRADES[cid].nameVi = cn.vi || cn.en;
            UPGRADES[cid].condition = spec;
            var ct = conditionText(spec);
            var pct = Math.round((UPGRADES[cid].boostEach || 0.06) * 100);
            UPGRADES[cid].descEn = "Works only if condition is true. +" + pct + "% efficiency. " + ct.en;
            UPGRADES[cid].descPt = "Só funciona se a condição for verdadeira. +" + pct + "% eficiência. " + ct.pt;
            UPGRADES[cid].descEs = "Solo funciona si la condición es verdadera. +" + pct + "% eficiencia. " + (ct.es || ct.en);
            UPGRADES[cid].descVi = "Chỉ chạy khi điều kiện đúng. +" + pct + "% hiệu suất. " + (ct.vi || ct.en);
            UPGRADES[cid].desc = function(lv){ return tr(this.descEn, this.descPt, this.descEs, this.descVi); };
            group.upgrades.push(cid);
        }
    }
    ensureMasterUpgrades(group);
}

function addGlobalTransportGroup(planet, blocks){
    if(blocks == null || blocks.length === 0) return;
    var key = planet === "erekir" ? "duct-network" : "conveyor-network";
    var group = GLOBAL_TRANSPORT_GROUPS[key];
    if(group != null) return;

    var rep = blocks[0];
    var blockFn = function(){ return rep; };
    var namesEn = planet === "erekir"
        ? ["Pneumatic Acceleration", "Pressure Lanes", "Synchronized Ducts", "High-Flow Chambers", "Duct Overclock", "Jam-Proof Routing", "Cargo Pulse", "Logistics Mastery"]
        : ["Logistics Acceleration", "Reinforced Belts", "Synchronized Lines", "High-Flow Belts", "Conveyor Overclock", "Jam-Proof Routing", "Cargo Pulse", "Logistics Mastery"];
    var namesPt = planet === "erekir"
        ? ["Aceleracao Pneumatica", "Linhas Pressurizadas", "Dutos Sincronizados", "Camara de Alto Fluxo", "Overclock de Dutos", "Roteamento Anti-Trava", "Pulso de Carga", "Maestria Logistica"]
        : ["Aceleracao Logistica", "Esteiras Reforcadas", "Linhas Sincronizadas", "Esteiras de Alto Fluxo", "Overclock de Esteiras", "Roteamento Anti-Trava", "Pulso de Carga", "Maestria Logistica"];
    var ids = [];
    for(var i = 0; i < 8; i++){
        var id = i === 0 ? key : key + "-" + (i + 1);
        ids.push(id);
        if(UPGRADES[id] == null){
            (function(upId, index){
                UPGRADES[upId] = makeGlobalUp(upId, blockFn, index === 0 ? 5 : 1,
                    function(lv){
                        if(planet === "erekir") return [[Items.beryllium, 180 + index * 55 + lv * 110],[Items.graphite, 100 + index * 40 + lv * 65]];
                        return [[Items.copper, 180 + index * 55 + lv * 110],[Items.lead, 100 + index * 40 + lv * 65]];
                    },
                    namesEn[index], namesPt[index],
                    planet === "erekir"
                        ? "Global upgrade: every Erekir duct receives +10% transport throughput per installed rank. No installation is required."
                        : "Global upgrade: every Serpulo conveyor receives +10% transport throughput per installed rank. No installation is required.",
                    planet === "erekir"
                        ? "Upgrade global: todos os dutos de Erekir recebem +10% de fluxo por nivel instalado. Nao precisa instalar."
                        : "Upgrade global: todas as esteiras de Serpulo recebem +10% de fluxo por nivel instalado. Nao precisa instalar.",
                    planet + " transport conveyor duct logistics speed global", planet === "erekir" ? "erekir-transport" : "serpulo-transport");
            })(id, i);
        }
    }
    group = {
        titleEn: planet === "erekir" ? "Duct Network" : "Conveyor Network",
        titlePt: planet === "erekir" ? "Rede de Dutos" : "Rede de Esteiras",
        globalTransport: true,
        dynamicTitle: true,
        block: blockFn,
        upgrades: ids,
        planet: planet,
        category: "distribution",
        transportBlocks: []
    };
    for(var j = 0; j < blocks.length; j++){
        group.transportBlocks.push("" + blocks[j].name);
        GLOBAL_TRANSPORT_BY_BLOCK["" + blocks[j].name] = ids;
    }
    GLOBAL_TRANSPORT_GROUPS[key] = group;
    GROUPS.push(group);
}


// Per-conveyor / per-duct global upgrades (same card style as network globals)
function addPerConveyorGlobalGroup(block){
    if(block == null || block.name == null) return;
    var bname = "" + block.name;
    var key = "conv-type-" + safePart(bname);
    if(GLOBAL_TRANSPORT_GROUPS[key] != null) return;

    var blockFn = function(){ return block; };
    var loc = block.localizedName != null ? ("" + block.localizedName) : bname;
    var isDuct = ("" + bname).toLowerCase().indexOf("duct") >= 0 || planetKeyForBlock(block) === "erekir";
    var namesEn = isDuct
        ? [loc + " Flow Tune", loc + " Pressure Seal", loc + " Sync Lanes", loc + " Burst Chamber", loc + " Line Overclock", loc + " Anti-Jam", loc + " Cargo Pulse", loc + " Mastery"]
        : [loc + " Belt Tune", loc + " Reinforced Links", loc + " Sync Timing", loc + " High-Flow", loc + " Line Overclock", loc + " Anti-Jam", loc + " Cargo Pulse", loc + " Mastery"];
    var namesPt = isDuct
        ? ["Ajuste de Fluxo (" + loc + ")", "Vedacao (" + loc + ")", "Faixas Sync (" + loc + ")", "Camara Burst (" + loc + ")", "Overclock (" + loc + ")", "Anti-Trava (" + loc + ")", "Pulso (" + loc + ")", "Maestria (" + loc + ")"]
        : ["Ajuste de Esteira (" + loc + ")", "Elos Reforcados (" + loc + ")", "Tempo Sync (" + loc + ")", "Alto Fluxo (" + loc + ")", "Overclock (" + loc + ")", "Anti-Trava (" + loc + ")", "Pulso (" + loc + ")", "Maestria (" + loc + ")"];

    var ids = [];
    for(var i = 0; i < 8; i++){
        var id = i === 0 ? key : key + "-" + (i + 1);
        ids.push(id);
        if(UPGRADES[id] == null){
            (function(upId, index, nmEn, nmPt){
                UPGRADES[upId] = makeGlobalUp(upId, blockFn, index === 0 ? 5 : 1,
                    function(lv){
                        if(isDuct) return [[Items.beryllium, 90 + index * 35 + lv * 70],[Items.graphite, 50 + index * 25 + lv * 40]];
                        return [[Items.copper, 90 + index * 35 + lv * 70],[Items.lead, 50 + index * 25 + lv * 40]];
                    },
                    nmEn, nmPt,
                    "Team upgrade for " + loc + ": +8% throughput per rank. Your team blocks become an optimized class; other teams stay vanilla.",
                    "Upgrade de time para " + loc + ": +8% de fluxo por nivel. Blocos do seu time viram classe otimizada; outros times ficam vanilla.",
                    bname + " transport conveyor duct " + loc + " global specific",
                    isDuct ? "erekir-transport" : "serpulo-transport");
            })(id, i, namesEn[i], namesPt[i]);
        }
    }

    var group = {
        titleEn: loc + " (Team NT)",
        titlePt: loc + " (Time NT)",
        globalTransport: true,
        dynamicTitle: true,
        perConveyor: true,
        block: blockFn,
        upgrades: ids,
        planet: planetKeyForBlock(block),
        category: "distribution",
        transportBlocks: [bname]
    };
    GLOBAL_TRANSPORT_GROUPS[key] = group;
    GROUPS.push(group);

    // Stack with network-wide IDs if already present
    var prev = GLOBAL_TRANSPORT_BY_BLOCK[bname];
    if(prev == null) GLOBAL_TRANSPORT_BY_BLOCK[bname] = ids.slice();
    else {
        var merged = prev.slice();
        for(var m = 0; m < ids.length; m++){
            if(merged.indexOf(ids[m]) < 0) merged.push(ids[m]);
        }
        GLOBAL_TRANSPORT_BY_BLOCK[bname] = merged;
    }
}


function appendSignatureUpgrades(group, block){
    if(group == null || block == null || group.upgrades == null) return;
    var n = (""+block.name).toLowerCase();
    var extras = [];
    if(n === "duo"){
        extras.push({id:"sig-duo-volley", en:"Twin Volley", pt:"Rajada Gemea", descEn:"+12% fire rate when installed.", descPt:"+12% cadencia ao instalar."});
        extras.push({id:"sig-duo-focus", en:"Focus Lens", pt:"Lente de Foco", descEn:"+8% range. Exclusive Duo tech.", descPt:"+8% alcance. Tech exclusiva do Duo."});
    }else if(n === "scatter"){
        extras.push({id:"sig-scatter-flak", en:"Flak Pattern", pt:"Padrao Flak", descEn:"Anti-air specialist: +10% damage.", descPt:"Anti-aereo: +10% dano."});
    }else if(n === "mechanical-drill" || n === "pneumatic-drill"){
        extras.push({id:"sig-drill-pulse", en:"Pulse Extractor", pt:"Extrator de Pulso", descEn:"+10% drill speed. Signature mining tech.", descPt:"+10% velocidade. Tech exclusiva de mineracao."});
    }else if(n === "silicon-smelter"){
        extras.push({id:"sig-silicon-pure", en:"Pure Silicon Cycle", pt:"Ciclo de Silicio Puro", descEn:"Signature smelter tech.", descPt:"Tech exclusiva da fundicao de silicio."});
    }else if(n === "arc"){
        extras.push({id:"sig-arc-chain", en:"Chain Surge", pt:"Surto em Cadeia", descEn:"+10% damage. Exclusive Arc tech.", descPt:"+10% dano. Tech exclusiva do Arc."});
    }else if(n === "hail"){
        extras.push({id:"sig-hail-barrage", en:"Barrage Protocol", pt:"Protocolo Rajada", descEn:"+10% rate of fire.", descPt:"+10% cadencia."});
    }
    for(var i = 0; i < extras.length; i++){
        var ex = extras[i];
        if(UPGRADES[ex.id] != null) continue;
        (function(exRef, blk){
            UPGRADES[exRef.id] = {
                id: exRef.id,
                block: function(){ return blk; },
                maxLevel: 1,
                max: 1,
                cost: function(lv){ return [[Items.copper, 120],[Items.lead, 80]]; },
                nameEn: exRef.en,
                namePt: exRef.pt,
                descEn: exRef.descEn,
                descPt: exRef.descPt,
                name: function(){ return tr(this.nameEn, this.namePt); },
                desc: function(lv){ return tr(this.descEn, this.descPt); },
                keys: n + " signature exclusive",
                boost: 0.10,
                installable: true
            };
        })(ex, block);
        group.upgrades.push(ex.id);
    }
}


// ========== MineDusty compatibility (ItsKirby69/MineDusty) ==========
function isMineDustyActive(){
    try{
        for(var i = 0; i < COMPAT_MODS.length; i++){
            if(COMPAT_MODS[i].id === "minedusty") return isCompatModLoaded(COMPAT_MODS[i]);
        }
    }catch(e){}
    return false;
}

function isNewHorizonActive(){
    try{
        for(var i = 0; i < COMPAT_MODS.length; i++){
            if(COMPAT_MODS[i].id === "new-horizon") return isCompatModLoaded(COMPAT_MODS[i]);
        }
    }catch(e){}
    return false;
}

function resolveMineDustyBlock(shortName){
    // Java mods usually register as modname-blockname
    var tries = [
        "minedusty-" + shortName,
        shortName,
        "minedusty-" + shortName.replace(/_/g, "-")
    ];
    for(var i = 0; i < tries.length; i++){
        try{
            var b = Vars.content.block(tries[i]);
            if(b != null) return b;
        }catch(e){}
        try{
            var found = null;
            Vars.content.blocks().each(function(x){
                if(found == null && x != null && (""+x.name) === tries[i]) found = x;
            });
            if(found != null) return found;
        }catch(e2){}
    }
    return null;
}

function addMineDustyGroup(block, upgradeDefs){
    if(block == null || upgradeDefs == null) return;
    var name = ""+block.name;
    if(BLOCK_GROUPS[name] != null) return; // already has New Tech's group
    var ids = [];
    for(var i = 0; i < upgradeDefs.length; i++){
        (function(def, index){
            var id = "md-" + safePart(name) + "-" + def.k;
            if(UPGRADES[id] == null){
                UPGRADES[id] = makeUp(id, function(){ return block; }, def.max || 3,
                    function(lv){
                        return [
                            [Items.copper, 80 + index * 30 + lv * 50],
                            [Items.lead, 50 + index * 20 + lv * 35],
                            [Items.graphite, 30 + index * 15 + lv * 25]
                        ];
                    },
                    def.en, def.pt,
                    def.deEn, def.dePt,
                    "minedusty " + name + " " + def.k
                );
                UPGRADES[id].boostEach = def.boostEach != null ? def.boostEach : 0.09;
                UPGRADES[id].compatMod = "minedusty";
            }
            ids.push(id);
        })(upgradeDefs[i], i);
    }
    var group = {
        titleEn: block.localizedName + " (MineDusty)",
        titlePt: block.localizedName + " (MineDusty)",
        dynamicTitle: true,
        block: function(){ return block; },
        upgrades: ids,
        category: categoryOfBlock(block) || "production",
        planet: "shared",
        compatMod: "minedusty",
        isDrillGroup: (""+block.name).toLowerCase().indexOf("drill") >= 0
    };
    GROUPS.push(group);
    BLOCK_GROUPS[name] = group;
    var cat = group.category;
    if(CATEGORY_GROUPS[cat] == null) CATEGORY_GROUPS[cat] = [];
    CATEGORY_GROUPS[cat].push(group);
}


function addCompatGroup(block, upgradeDefs, compatId, tag){
    if(block == null || upgradeDefs == null) return;
    var name = ""+block.name;
    if(BLOCK_GROUPS[name] != null) return;
    var ids = [];
    for(var i = 0; i < upgradeDefs.length; i++){
        (function(def, index){
            var id = (compatId || "compat") + "-" + safePart(name) + "-" + def.k;
            if(UPGRADES[id] == null){
                UPGRADES[id] = makeUp(id, function(){ return block; }, def.max || 3,
                    function(lv){
                        return [
                            [Items.copper, 90 + index * 35 + lv * 55],
                            [Items.lead, 55 + index * 22 + lv * 40],
                            [Items.titanium, 20 + index * 15 + lv * 25]
                        ];
                    },
                    def.en, def.pt,
                    def.deEn, def.dePt,
                    (compatId || "") + " " + name + " " + def.k
                );
                UPGRADES[id].boostEach = def.boostEach != null ? def.boostEach : 0.09;
                UPGRADES[id].compatMod = compatId;
            }
            ids.push(id);
        })(upgradeDefs[i], i);
    }
    var group = {
        titleEn: block.localizedName + " (" + (tag || compatId) + ")",
        titlePt: block.localizedName + " (" + (tag || compatId) + ")",
        dynamicTitle: true,
        block: function(){ return block; },
        upgrades: ids,
        category: categoryOfBlock(block) || "production",
        planet: "shared",
        compatMod: compatId
    };
    GROUPS.push(group);
    BLOCK_GROUPS[name] = group;
    var cat = group.category;
    if(CATEGORY_GROUPS[cat] == null) CATEGORY_GROUPS[cat] = [];
    CATEGORY_GROUPS[cat].push(group);
}

function registerNewHorizonUpgrades(){
    if(!isNewHorizonActive()){
        Log.info("New Tech's: New Horizon not detected — skip compat upgrades");
        return;
    }
    Log.info("New Tech's: New Horizon detected — registering compat upgrades");
    var registered = 0;
    try{
        Vars.content.blocks().each(function(b){
            try{
                if(b == null || b.name == null) return;
                var n = (""+b.name).toLowerCase();
                if(n.indexOf("new-horizon-") !== 0 && n.indexOf("newhorizon-") !== 0) return;
                if(BLOCK_GROUPS[""+b.name] != null) return;
                try{ if(b.logicVisible && !b.logicVisible()) return; }catch(eV){}
                var cat = categoryOfBlock(b);
                if(cat !== "production" && cat !== "crafting" && cat !== "power" && cat !== "turret" && cat !== "defense" && cat !== "liquid" && cat !== "unit") return;
                addCompatGroup(b, [
                    {k:"speed", max:3, en:"Horizon Tune", pt:"Ajuste Horizon", deEn:"New Horizon speed rank %l/3.", dePt:"Velocidade New Horizon rank %l/3.", boostEach:0.10},
                    {k:"cap", max:2, en:"Horizon Buffer", pt:"Buffer Horizon", deEn:"Extra capacity / efficiency rank %l/2.", dePt:"Capacidade / eficiencia rank %l/2.", boostEach:0.07}
                ], "nh", "New Horizon");
                registered++;
            }catch(eB){}
        });
    }catch(eScan){}
    Log.info("New Tech's: New Horizon groups registered ≈ " + registered);
}


function registerMineDustyUpgrades(){
    if(!isMineDustyActive()){
        Log.info("New Tech's: MineDusty not detected — skip compat upgrades");
        return;
    }
    Log.info("New Tech's: MineDusty detected — registering compat upgrades");

    // Known short names from DustDrills / DustCrafters / DustPower (mod.json name: minedusty)
    var specs = [
        { shortName: "copper-drill", ups: [
            {k:"speed", max:3, en:"Dust Bits", pt:"Brocas Dusty", deEn:"MineDusty copper drill speed rank %l/3.", dePt:"Velocidade da copper-drill MineDusty rank %l/3.", boostEach:0.11},
            {k:"water", max:2, en:"Oasis Coolant", pt:"Refrigerante Oasis", deEn:"Extra water boost rank %l/2.", dePt:"Boost extra de agua rank %l/2.", boostEach:0.05}
        ]},
        { shortName: "chloro-drill", ups: [
            {k:"speed", max:3, en:"Chloro Teeth", pt:"Dentes Chloro", deEn:"Chloro-drill speed rank %l/3.", dePt:"Velocidade chloro-drill rank %l/3.", boostEach:0.12},
            {k:"bio", max:2, en:"Bio Feed", pt:"Alimentacao Bio", deEn:"Works better with bio liquid rank %l/2.", dePt:"Melhor com bio liquid rank %l/2.", boostEach:0.08}
        ]},
        { shortName: "offshore-drill", ups: [
            {k:"speed", max:3, en:"Tide Drill", pt:"Broca da Mare", deEn:"Offshore drill speed rank %l/3.", dePt:"Velocidade offshore-drill rank %l/3.", boostEach:0.11}
        ]},
        { shortName: "crystal-bore", ups: [
            {k:"speed", max:3, en:"Crystal Pulse", pt:"Pulso de Cristal", deEn:"Crystal bore speed rank %l/3.", dePt:"Velocidade crystal-bore rank %l/3.", boostEach:0.12}
        ]},
        { shortName: "oil-tap", ups: [
            {k:"speed", max:2, en:"Tar Flow", pt:"Fluxo de Piche", deEn:"Oil tap output rank %l/2.", dePt:"Saida do oil-tap rank %l/2.", boostEach:0.10}
        ]},
        { shortName: "solar-pump", ups: [
            {k:"pump", max:2, en:"Sun Siphon", pt:"Sifao Solar", deEn:"Solar pump rate rank %l/2.", dePt:"Taxa do solar-pump rank %l/2.", boostEach:0.10}
        ]},
        { shortName: "lobe-pump", ups: [
            {k:"pump", max:2, en:"Lobe Rush", pt:"Lobe Acelerado", deEn:"Lobe pump rate rank %l/2.", dePt:"Taxa do lobe-pump rank %l/2.", boostEach:0.10}
        ]},
        { shortName: "carbonic-concentrator", ups: [
            {k:"speed", max:3, en:"Carbon Crush", pt:"Trituracao de Carbono", deEn:"Carbonic concentrator speed rank %l/3.", dePt:"Velocidade carbonic-concentrator rank %l/3.", boostEach:0.10}
        ]},
        { shortName: "carbonic-press", ups: [
            {k:"speed", max:3, en:"Press Harder", pt:"Prensa Forte", deEn:"Carbonic press speed rank %l/3.", dePt:"Velocidade carbonic-press rank %l/3.", boostEach:0.10}
        ]},
        { shortName: "silica-forge", ups: [
            {k:"speed", max:3, en:"Silica Bloom", pt:"Flor de Silica", deEn:"Silica forge speed rank %l/3.", dePt:"Velocidade silica-forge rank %l/3.", boostEach:0.10}
        ]},
        { shortName: "biosludge-chamber", ups: [
            {k:"speed", max:2, en:"Sludge Metabolism", pt:"Metabolismo de Lodo", deEn:"Biosludge chamber speed rank %l/2.", dePt:"Velocidade biosludge-chamber rank %l/2.", boostEach:0.11}
        ]},
        { shortName: "chlorophyte-cultivator", ups: [
            {k:"speed", max:2, en:"Turf Growth", pt:"Crescimento do Solo", deEn:"Chlorophyte cultivator speed rank %l/2.", dePt:"Velocidade chlorophyte-cultivator rank %l/2.", boostEach:0.11}
        ]},
        { shortName: "geothermal-generator", ups: [
            {k:"power", max:2, en:"Heat Tap", pt:"Torneira de Calor", deEn:"Geothermal output rank %l/2.", dePt:"Saida geotermica rank %l/2.", boostEach:0.09}
        ]},
        { shortName: "carbonic-combustor", ups: [
            {k:"power", max:2, en:"Clean Burn", pt:"Queima Limpa", deEn:"Carbonic combustor power rank %l/2.", dePt:"Energia do carbonic-combustor rank %l/2.", boostEach:0.09}
        ]},
        { shortName: "solar-panel", ups: [
            {k:"power", max:2, en:"Leaf Panels", pt:"Paineis Folha", deEn:"Solar panel output rank %l/2.", dePt:"Saida solar-panel rank %l/2.", boostEach:0.08}
        ]}
    ];

    // Water boost flag on copper-drill water upgrade
    var registered = 0;
    for(var i = 0; i < specs.length; i++){
        try{
            var sp = specs[i];
            var block = resolveMineDustyBlock(sp.shortName);
            if(block == null) continue;
            // attach waterBoostEach for water-ish upgrades
            for(var u = 0; u < sp.ups.length; u++){
                if(sp.ups[u].k === "water" || sp.ups[u].k === "bio"){
                    sp.ups[u].boostEach = sp.ups[u].boostEach || 0.05;
                }
            }
            addMineDustyGroup(block, sp.ups);
            // post-fix waterBoostEach on ids
            try{
                var gn = BLOCK_GROUPS[""+block.name];
                if(gn != null){
                    for(var j = 0; j < gn.upgrades.length; j++){
                        var uid = gn.upgrades[j];
                        if(uid.indexOf("-water") >= 0 || uid.indexOf("-bio") >= 0){
                            if(UPGRADES[uid] != null) UPGRADES[uid].waterBoostEach = 0.18;
                        }
                    }
                }
            }catch(eW){}
            registered++;
        }catch(eOne){}
    }

    // Catch-all: any remaining minedusty production/crafting/power blocks get a single speed card
    try{
        Vars.content.blocks().each(function(b){
            try{
                if(b == null || b.name == null) return;
                var n = (""+b.name).toLowerCase();
                if(n.indexOf("minedusty-") !== 0) return;
                if(BLOCK_GROUPS[""+b.name] != null) return;
                if(!b.logicVisible || !b.logicVisible()) return;
                var cat = categoryOfBlock(b);
                if(cat !== "production" && cat !== "crafting" && cat !== "power" && cat !== "liquid") return;
                // skip pure env/decor if any slipped through
                addMineDustyGroup(b, [
                    {k:"speed", max:2, en:"MineDusty Tune", pt:"Ajuste MineDusty", deEn:"Generic MineDusty speed rank %l/2.", dePt:"Velocidade generica MineDusty rank %l/2.", boostEach:0.09}
                ]);
                registered++;
            }catch(eB){}
        });
    }catch(eScan){}

    Log.info("New Tech's: MineDusty groups registered ≈ " + registered);
}


function ensureCatalogBuilt(){
    if(catalogBuilt) return;
    if(Vars.content == null || Vars.content.blocks == null) return;

    BLOCK_GROUPS = {};
    CATEGORY_GROUPS = {};
    GLOBAL_TRANSPORT_BY_BLOCK = {};
    GLOBAL_TRANSPORT_GROUPS = {};

    // Keep legacy groups/IDs intact, but attach each one to the real block category.
    for(var g = 0; g < GROUPS.length; g++){
        var legacy = GROUPS[g];
        try{
            var lb = legacy.block();
            if(lb != null){
                legacy.category = categoryOfBlock(lb);
                BLOCK_GROUPS["" + lb.name] = legacy;
            }
        }catch(e){}
    }

    var serpuloTransport = [];
    var erekirTransport = [];
    Vars.content.blocks().each(function(b){
        try{
            if(b == null || b.name == null || !b.logicVisible()) return;
            var name = "" + b.name;
            var category = categoryOfBlock(b);
            if(isTransportBlock(b)){
                var pk = planetKeyForBlock(b);
                var lname = name.toLowerCase();
                if(pk === "erekir" || lname.indexOf("duct") >= 0) erekirTransport.push(b);
                else serpuloTransport.push(b);
                return;
            }

            var group = BLOCK_GROUPS[name];
            if(group == null){
                (function(block, cat){
                    group = {
                        titleEn: "",
                        titlePt: "",
                        dynamicTitle: true,
                        block: function(){ return block; },
                        upgrades: [],
                        planet: planetKeyForBlock(block),
                        category: cat
                    };
                })(b, category);
                GROUPS.push(group);
                BLOCK_GROUPS[name] = group;
            }else{
                group.category = category;
                if(group.planet == null) group.planet = planetKeyForBlock(b);
            }
            ensureGroupEight(group);
        }catch(err){}
    });

    // addGlobalTransportGroup serpulo disabled
    // addGlobalTransportGroup erekir disabled

    // Distribution removed — no per-conveyor cards

    for(var cg = 0; cg < CATEGORY_ORDER.length; cg++) CATEGORY_GROUPS[CATEGORY_ORDER[cg]] = [];
    try{
        for(var si = 0; si < GROUPS.length; si++){
            var sg = GROUPS[si];
            if(sg != null && sg.block != null) appendSignatureUpgrades(sg, sg.block());
        }
    }catch(eSig){}

    // Drop distribution groups entirely
    var filteredGroups = [];
    for(var fi = 0; fi < GROUPS.length; fi++){
        var fg = GROUPS[fi];
        if(fg == null) continue;
        var fcat = fg.category || (fg.block != null ? categoryOfBlock(fg.block()) : "");
        if(fcat === "distribution") continue;
        filteredGroups.push(fg);
    }
    GROUPS = filteredGroups;

    for(var gi = 0; gi < GROUPS.length; gi++){
        var gg = GROUPS[gi];
        if(gg == null || gg.block == null) continue;
        var cat = gg.category || categoryOfBlock(gg.block());
        if(cat === "distribution") continue;
        if(CATEGORY_GROUPS[cat] == null) CATEGORY_GROUPS[cat] = [];
        CATEGORY_GROUPS[cat].push(gg);
    }
    try{ buildBulletCatalog(); }catch(eB){ Log.err("New Tech's bullet catalog: " + eB); }
    try{ registerMineDustyUpgrades(); }catch(eMD){ Log.err("New Tech's MineDusty: " + eMD); }
    try{ applyAllBulletUpgrades(); }catch(eA){}
    catalogBuilt = true;
}

function groupTitle(g){
    if(g == null) return tr("Unknown", "Desconhecido");
    if(g.bulletGroup){
        if(g.isUnitBullet && g.unitType != null){
            return tr("BULLET // " + g.unitType.localizedName, "TIRO // " + g.unitType.localizedName);
        }
        if(g.titleEn != null) return tr(g.titleEn, g.titlePt || g.titleEn);
    }
    var b = g.block != null ? g.block() : null;
    if(g.globalTransport){
        if(g.perConveyor){
            var ploc = b != null && b.localizedName != null ? ("" + b.localizedName) : "Transport";
            return tr("LOGISTICS // " + ploc, "LOGISTICA // " + ploc);
        }
        return g.planet === "erekir"
            ? tr("LOGISTICS // DUCT NETWORK", "LOGISTICA // REDE DE DUTOS")
            : tr("LOGISTICS // CONVEYOR NETWORK", "LOGISTICA // REDE DE ESTEIRAS");
    }
    if(b == null) return tr("Unknown Block", "Bloco Desconhecido");
    var cat = g.category || categoryOfBlock(b);
    return tr((CATEGORY_LABELS_EN[cat] || "SYSTEM") + " // " + b.localizedName, (CATEGORY_LABELS_PT[cat] || "SISTEMA") + " // " + b.localizedName);
}

function currentPlanetName(){
    try{
        var p = currentPlanetObject();
        if(p != null && p.name != null) return "" + p.name;
    }catch(e){}
    return "";
}


function groupDisplayName(g){
    if(g == null) return "?";
    try{
        if(g.bulletGroup){
            if(g.ammoGroup && g.block != null) return "" + g.block().localizedName;
            if(g.isUnitBullet && g.unitType != null) return "" + g.unitType.localizedName;
            if(g.titleEn != null){
                // prefer localized unit/block title without suffix noise
                var b = g.block != null ? g.block() : null;
                if(b != null && !g.isUnitBullet) return "" + b.localizedName;
                return L({en: g.titleEn, pt: g.titlePt || g.titleEn, es: g.titleEn, vi: g.titleEn});
            }
        }
        if(g.globalTransport) return groupTitle(g);
        if(g.block != null){
            var bb = g.block();
            if(bb != null) return "" + bb.localizedName;
        }
    }catch(e){}
    return groupTitle(g);
}

function groupVisible(g){
    if(g == null) return false;
    // Unit bullet groups: planet + campaign unlock
    if(g.bulletGroup && g.isUnitBullet){
        if(g.unitType == null) return false;
        try{ if(isCampaign() && !isUnlockedInVanillaResearch(g.unitType)) return false; }catch(eU0){}
        return unitOnCurrentPlanet(g.unitType);
    }
    if(g.block == null) return false;
    var b = g.block();
    if(b == null) return false;
    // Campaign: only blocks already researched in vanilla tech tree
    if(isCampaign() && !g.globalTransport){
        try{
            if(!isUnlockedInVanillaResearch(b)) return false;
        }catch(eU){ return false; }
    }
    // Planet filter (global transport)
    if(g.globalTransport){
        var pn = currentPlanetName().toLowerCase();
        if(pn === "sun" || isSunPlanet(currentPlanetObject())) return true;
        if(pn === "" || pn === "custom") return true;
        return pn === ("" + g.planet).toLowerCase();
    }
    // Turret/unit bullet groups + normal blocks: planet filter always
    if(!blockOnCurrentPlanet(b)) return false;
    // Soft visibility (hide pure logic/editor-only junk)
    try{ if(!blockVisibleNow(b)) return false; }catch(eV){}
    return true;
}

function costText(stacks){
    if(stacks.length === 0) return "-";
    var parts = [];
    for(var i = 0; i < stacks.length; i++) parts.push(stacks[i][1] + " " + stacks[i][0].localizedName);
    return parts.join(" + ");
}

function findCore(){
    if(Vars.state != null && Vars.state.isGame() && Vars.player != null){
        var core = Vars.player.core();
        if(core != null) return core;
        var team = Vars.player.team();
        if(team != null && team.cores != null && team.cores.size > 0) return team.cores.first();
    }
    return null;
}

function researchCores(){
    var out = [];
    try{
        if(Vars.player != null){
            var team = Vars.player.team();
            if(team != null && team.cores != null){
                for(var i = 0; i < team.cores.size; i++){
                    var c = team.cores.get(i);
                    if(c != null && c.isValid() && out.indexOf(c) < 0) out.push(c);
                }
            }
            var pc = Vars.player.core();
            if(pc != null && pc.isValid() && out.indexOf(pc) < 0) out.unshift(pc);
        }
    }catch(e){}
    if(out.length === 0){
        var fallback = findCore();
        if(fallback != null) out.push(fallback);
    }
    return out;
}
function coreList(coreOrCores){
    if(coreOrCores == null) return [];
    if(coreOrCores.length != null && coreOrCores.items == null) return coreOrCores;
    return [coreOrCores];
}
function totalResearchItems(coreOrCores, item){
    var cores = coreList(coreOrCores);
    var total = 0;
    for(var i = 0; i < cores.length; i++){
        try{ if(cores[i] != null && cores[i].items != null) total += cores[i].items.get(item)|0; }catch(e){}
    }
    return total;
}
function hasAny(coreOrCores, stacks){
    var cores = coreList(coreOrCores);
    if(cores.length === 0) return false;
    for(var i = 0; i < stacks.length; i++){
        if(stacks[i][1] > 0 && totalResearchItems(cores, stacks[i][0]) > 0) return true;
    }
    return false;
}
function canFull(coreOrCores, stacks){
    if(isSandbox()) return true;
    var cores = coreList(coreOrCores);
    if(cores.length === 0) return false;
    if(stacks == null || stacks.length === 0) return true;
    for(var i = 0; i < stacks.length; i++){
        if(totalResearchItems(cores, stacks[i][0]) < stacks[i][1]) return false;
    }
    return true;
}
function payStacks(coreOrCores, stacks){
    if(isSandbox()) return;
    var cores = coreList(coreOrCores);
    for(var i = 0; i < stacks.length; i++){
        var need = stacks[i][1]|0;
        for(var c = 0; c < cores.length && need > 0; c++){
            var core = cores[c];
            if(core == null || core.items == null) continue;
            var have = core.items.get(stacks[i][0])|0;
            var pay = Math.min(have, need)|0;
            if(pay > 0){
                core.items.remove(stacks[i][0], pay);
                need -= pay;
            }
        }
    }
}

function contributeResearch(u){
    var lv = levelOf(u.id);
    if(lv >= u.max) return false;
    var cores = researchCores();
    if(cores.length === 0) return false;
    var rem = remainingCost(u);
    if(rem.length === 0){ setLevel(u.id, lv+1); clearPartial(u.id); return true; }
    if(!hasAny(cores, rem)) return false;

    var partial = getPartial(u.id);
    var full = u.cost(lv + 1);
    for(var i = 0; i < rem.length; i++){
        var it = rem[i][0];
        var need = rem[i][1];
        var available = totalResearchItems(cores, it);
        var pay = Math.min(available|0, need|0)|0;
        if(pay > 0){
            var left = pay;
            for(var ci = 0; ci < cores.length && left > 0; ci++){
                var core = cores[ci];
                if(core == null || core.items == null) continue;
                var have = core.items.get(it)|0;
                var take = Math.min(have, left)|0;
                if(take > 0){
                    core.items.remove(it, take);
                    left -= take;
                }
            }
            var fullAmt = 0;
            for(var j = 0; j < full.length; j++) if(full[j][0] === it) fullAmt += full[j][1];
            partial[it.name] = ((fullAmt - need) + pay)|0;
        }
    }
    setPartial(u.id, partial);
    if(remainingCost(u).length === 0){
        setLevel(u.id, lv + 1);
        clearPartial(u.id);
    }
    return true;
}

function norm(s){
    if(s == null) return "";
    return (""+s).toLowerCase()
        .replace(/[áàãâä]/g,"a").replace(/[éèêë]/g,"e")
        .replace(/[íìîï]/g,"i").replace(/[óòõôö]/g,"o")
        .replace(/[úùûü]/g,"u").replace(/ç/g,"c");
}

function matches(u, gTitle, block, query){
    if(!query) return true;
    var q = norm(query);
    var blob = norm(upgradeDisplayName(u) + " " + gTitle + " " + u.keys + " " + (block != null ? block.localizedName : "") + " " + u.id + " " + (u.globalKind || ""));
    if(blob.indexOf(q) >= 0) return true;
    var parts = blob.split(/[\s\-_]+/);
    for(var i = 0; i < parts.length; i++) if(parts[i].indexOf(q) === 0) return true;
    return false;
}

function globalTransportRankForBlock(block){
    ensureCatalogBuilt();
    if(block == null) return 0;
    var ids = GLOBAL_TRANSPORT_BY_BLOCK["" + block.name];
    if(ids == null) return 0;
    var total = 0;
    for(var i = 0; i < ids.length; i++) total += levelOf(ids[i]);
    return total;
}

function upgradesForBlock(block){
    ensureCatalogBuilt();
    try{ registerExclusiveRollUpgrades(); }catch(eEx){}
    if(block == null) return [];
    // Ensure this block's cards exist (walls/defense were empty until category opened)
    try{
        var gFix = BLOCK_GROUPS[""+block.name];
        if(gFix != null) ensureGroupReady(gFix);
        else {
            // create on the fly for defense/walls etc.
            var cat = categoryOfBlock(block);
            if(cat !== "distribution"){
                gFix = {
                    titleEn: "", titlePt: "", dynamicTitle: true,
                    block: function(){ return block; },
                    upgrades: [],
                    planet: planetKeyForBlock(block),
                    category: cat,
                    _enriched: false
                };
                BLOCK_GROUPS[""+block.name] = gFix;
                GROUPS.push(gFix);
                ensureGroupReady(gFix);
            }
        }
    }catch(eEn){}
    var list = [];
    var seen = {};
    function addGroup(g){
        if(g == null || g.globalTransport) return;
        if(g.upgrades == null) return;
        for(var i = 0; i < g.upgrades.length; i++){
            var id = g.upgrades[i];
            if(seen[id]) continue;
            var u = UPGRADES[id];
            if(u != null && canShowUpgradeInResearch(u)){
                list.push(u);
                seen[id] = true;
            }
        }
    }
    var name = "" + block.name;
    addGroup(BLOCK_GROUPS[name]);
    // Bullet upgrades live in a parallel group — must show in install UI
    addGroup(BLOCK_GROUPS["bullet-turret-" + name]);
    // Fallback: scan bullet category groups for this block
    try{
        var bg = CATEGORY_GROUPS["bullet"];
        if(bg != null){
            for(var bi = 0; bi < bg.length; bi++){
                var gg = bg[bi];
                if(gg == null || gg.isUnitBullet) continue;
                try{
                    if(gg.block != null && gg.block() === block) addGroup(gg);
                    else if(gg.block != null && gg.block() != null && (""+gg.block().name) === name) addGroup(gg);
                }catch(eG){}
            }
        }
    }catch(eB){}
    return list;
}

function researchedCount(group){
    if(group == null || group.upgrades == null) return 0;
    var count = 0;
    for(var i = 0; i < group.upgrades.length; i++) if(levelOf(group.upgrades[i]) > 0) count++;
    return count;
}

function showBlockResearchDialog(group, returnCategory, restoreScrollY, tabName){
    ensureCatalogBuilt();
    var block = group != null ? group.block() : null;
    if(group == null || block == null) return;
    if(tabName == null) tabName = "core";
    var brScrollKey = "block-" + block.name + "-" + tabName;
    if(restoreScrollY == null || restoreScrollY === 0){
        try{ restoreScrollY = uiScrollGet(brScrollKey); }catch(e){}
    }

    var dialog = new BaseDialog(groupDisplayName(group));
    var body = new Table();
    body.defaults().pad(4).growX();
    var researchPane = null;

    // Header + breadcrumb
    body.table(Styles.none, function(head){
        head.button(tr("Back", "Voltar"), Icon.left, function(){
            dialog.hide();
            showCategoryDialog(returnCategory);
        }).size(Vars.mobile ? 90 : 110, 36);
        head.add("[accent]" + crumb([catLabel(returnCategory), groupDisplayName(group)])).growX().wrap().padLeft(6);
    }).growX().row();
    body.add("[lightgray]" + tr("Pay with core items to raise research level. Then install on the map with two taps on the building.", "Pague com itens do nucleo para subir o nivel. Depois instale no mapa com dois toques no predio.")).wrap().padBottom(4).row();

    // (C) Progress bar at top
    var coreUps = [];
    var condUps = [];
    var masterUps = [];
    try{
        for(var i = 0; i < group.upgrades.length; i++){
            var u0 = group.upgrades[i];
            if(u0 == null) continue;
            if(typeof u0 === "string") u0 = UPGRADES[u0];
            if(u0 == null) continue;
            if(u0.conditional) condUps.push(u0);
            else coreUps.push(u0);
        }
        if(group.masterUpgrades != null){
            for(var mi = 0; mi < group.masterUpgrades.length; mi++){
                var mu = MASTER_UPGRADES[group.masterUpgrades[mi]];
                if(mu != null) masterUps.push(mu);
            }
        }
    }catch(eU){}

    function countDone(arr){
        var n = 0;
        for(var i = 0; i < arr.length; i++){
            var u = arr[i];
            var maxLv = u.max != null ? u.max : (u.maxLevel != null ? u.maxLevel : 1);
            if((levelOf(u.id)|0) >= maxLv) n++;
        }
        return n;
    }
    var doneAll = countDone(coreUps) + countDone(condUps) + countDone(masterUps);
    var totalAll = coreUps.length + condUps.length + masterUps.length;
    var fracAll = totalAll > 0 ? doneAll / totalAll : 0;
    body.add(progressBarText(fracAll, fracAll >= 1) + " [lightgray]" + doneAll + "/" + totalAll + " " + tr("researched", "pesquisado")).padBottom(4).row();

    // (B) Tabs Core / Cond / Master
    body.table(Styles.none, function(tabs){
        var defs = [
            {id:"core", en:"Core", pt:"Core", n: coreUps.length, d: countDone(coreUps)},
            {id:"cond", en:"Cond", pt:"Cond", n: condUps.length, d: countDone(condUps)},
            {id:"master", en:"Master", pt:"Master", n: masterUps.length, d: countDone(masterUps)}
        ];
        for(var ti = 0; ti < defs.length; ti++){
            (function(d){
                var sel = tabName === d.id;
                tabs.button((sel ? "[accent]" : "") + tr(d.en, d.pt) + " " + d.d + "/" + d.n, function(){
                    var keep = 0;
                    try{ keep = researchPane != null ? researchPane.getScrollY() : 0; }catch(e){}
                    dialog.hide();
                    Core.app.post(function(){ showBlockResearchDialog(group, returnCategory, keep, d.id); });
                }).height(36).pad(2);
            })(defs[ti]);
        }
    }).growX().padBottom(6).row();

    var list = tabName === "cond" ? condUps : (tabName === "master" ? masterUps : coreUps);

    // (A) Compact cards
    for(var j = 0; j < list.length; j++){
        (function(u){
            if(u == null) return;
            var lv = levelOf(u.id)|0;
            var maxLv = u.max != null ? u.max : (u.maxLevel != null ? u.maxLevel : 1);
            if(maxLv < 1) maxLv = 1;
            var maxed = lv >= maxLv;
            var rem = [];
            try{ rem = remainingCost(u); }catch(eR){ rem = []; }
            var cores = researchCores();
            var canFullPay = !maxed && canFull(cores, rem);
            var isMaster = tabName === "master";
            var missionDone = !isMaster || isMasterMissionComplete(u.id);

            body.table(Tex.pane, function(tbl){
                try{ ntFadeIn(tbl, 0.04 * j); }catch(eAnR){}
                tbl.left().defaults().left().pad(3);
                // one compact row: name + level
                tbl.table(Styles.none, function(row){
                    row.add((maxed ? "[lime]" : "[white]") + upgradeDisplayName(u)).growX().wrap();
                    row.add("[gray]" + lv + "/" + maxLv).padLeft(6);
                }).growX().row();
                // short desc one line
                var dtxt = upgradeDisplayDesc(u, lv > 0 ? lv : 1);
                if(dtxt && dtxt.length > 0){
                    if(dtxt.length > 72) dtxt = dtxt.substring(0, 70) + "…";
                    tbl.add("[lightgray]" + dtxt).growX().wrap().row();
                }
                if(isMaster && !maxed){
                    tbl.add(missionDone ? "[lime]" + tr("Mission OK", "Missao OK") : "[yellow]" + tr("Mission locked", "Missao bloqueada")).row();
                }
                if(!maxed){
                    tbl.add((canFullPay ? "[lightgray]" : "[scarlet]") + costText(rem)).wrap().row();
                }else{
                    tbl.add("[lime]" + tr("Maxed", "Max")).row();
                }
                tbl.button(maxed ? tr("Done", "Feito") : (canFullPay && missionDone ? tr("Research", "Pesquisar") : tr("Pay", "Pagar")), function(){
                    var keepScrollY = 0;
                    try{ keepScrollY = researchPane.getScrollY(); }catch(e){}
                    if(isMaster && !isMasterMissionComplete(u.id)){
                        quietInfo(tr("Complete the mission first.", "Conclua a missão primeiro."));
                        return;
                    }
                    var changed = false;
                    if(lv < maxLv){
                        changed = tryResearchNow(u);
                        if(!changed) quietInfo(tr("Need resources in cores.", "Precisa recursos nos nucleos."));
                        else quietInfo(tr("Researched!", "Pesquisado!"));
                    }
                    dialog.hide();
                    // (F) restore scroll + same tab
                    Core.app.post(function(){ showBlockResearchDialog(group, returnCategory, keepScrollY, tabName); });
                }).disabled(maxed || (isMaster && !missionDone)).size(Vars.mobile ? 130 : 150, 38).padTop(2);
            }).growX().padBottom(3).row();
        })(list[j]);
    }

    if(list.length === 0){
        body.add("[lightgray]" + tr("Nothing in this tab.", "Nada nesta aba.")).pad(12).row();
    }

    dialog.addCloseButton();
    researchPane = dialog.cont.pane(body).grow().pad(6).get();
    dialog.show();
    if(restoreScrollY != null){
        try{
            Core.app.post(function(){
                try{ try{ if(researchPane.setScrollYForce != null) researchPane.setScrollYForce(restoreScrollY); else researchPane.setScrollY(restoreScrollY); }catch(eSc0){}
                try{ uiScrollSet(brScrollKey, restoreScrollY); }catch(eSc){} }catch(e){}
            });
        }catch(e){}
    }
}

function showCategoryDialog(category){
    ensureCatalogBuilt();
    loadUiPrefs();
    var dialog = new BaseDialog(catLabel(category));
    var query = {v:""};
    var list = new Table();

    function rebuild(){
        list.clearChildren();
        var groups = CATEGORY_GROUPS[category] || [];
        var filtered = [];
        for(var i = 0; i < groups.length; i++){
            var g = groups[i];
            if(!groupVisible(g)) continue;
            if(!groupMatchesFilter(g, uiBlockFilter)) continue;
            var disp = groupDisplayName(g);
            if(query.v && norm(disp + " " + groupTitle(g) + " " + category).indexOf(norm(query.v)) < 0) continue;
            filtered.push(g);
        }
        try{
            filtered.sort(function(a, b){
                var an = "", bn = "";
                try{ if(a.block != null) an = ""+a.block().name; }catch(e1){}
                try{ if(b.block != null) bn = ""+b.block().name; }catch(e2){}
                var af = isFavoriteBlock(an) ? 0 : 1;
                var bf = isFavoriteBlock(bn) ? 0 : 1;
                if(af !== bf) return af - bf;
                return groupDisplayName(a).localeCompare(groupDisplayName(b));
            });
        }catch(eSort){}

        if(filtered.length === 0){
            list.add("[lightgray]" + tr("No blocks in this section.", "Nenhum bloco nesta secao.")).pad(16).row();
            return;
        }

        for(var j = 0; j < filtered.length; j++){
            (function(g){
                var display = groupDisplayName(g);
                var bname = "";
                try{ if(g.block != null) bname = ""+g.block().name; }catch(eN){}
                var fav = isFavoriteBlock(bname);
                var researched = researchedCount(g)|0;
                var upN = g.upgrades != null ? g.upgrades.length : 0;
                var tag = researched + "/" + upN;
                if(g.globalTransport) tag = tr("TEAM", "TIME");
                if(g.bulletGroup) tag = researched + "/" + upN;

                if(uiCompactMode){
                    list.table(Styles.none, function(row){
                        try{ ntFadeIn(row, 0.03 * j); }catch(eAn){}
                        row.left().defaults().left().pad(2);
                        try{
                            if(g.unitType != null && g.unitType.uiIcon != null){
                                row.image(g.unitType.uiIcon).size(32).padRight(6);
                            }else{
                                var blk = g.block != null ? g.block() : null;
                                if(blk != null && blk.uiIcon != null) row.image(blk.uiIcon).size(32).padRight(6);
                            }
                        }catch(eIc){}
                        row.button((fav ? "[#ffd54f]" : "") + display + "  [gray]" + tag, Styles.cleart, function(){
                            dialog.hide();
                            showBlockResearchDialog(g, category);
                        }).growX().height(40);
                        row.button(fav ? "[#ffd54f]★" : "☆", Styles.cleart, function(){
                            if(bname) toggleFavoriteBlock(bname);
                            rebuild();
                        }).size(36, 36);
                    }).growX().padBottom(2).row();
                }else{
                    list.table(Tex.button, function(tbl){
                        try{ ntFadeIn(tbl, 0.03 * j); }catch(eAn2){}
                        tbl.left().defaults().left().pad(3);
                        tbl.table(Styles.none, function(row){
                            try{
                                if(g.unitType != null && g.unitType.uiIcon != null){
                                    row.image(g.unitType.uiIcon).size(36).padRight(6);
                                }else{
                                    var blk2 = g.block != null ? g.block() : null;
                                    if(blk2 != null && blk2.uiIcon != null) row.image(blk2.uiIcon).size(36).padRight(6);
                                }
                            }catch(eIc2){}
                            row.add((fav ? "[#ffd54f]" : "[white]") + display).growX().wrap();
                            row.button(fav ? "[#ffd54f]★" : "[lightgray]☆", Styles.cleart, function(){
                                if(bname) toggleFavoriteBlock(bname);
                                rebuild();
                            }).size(40, 36);
                        }).growX().row();
                        tbl.add("[gray]" + tag + (researched >= 3 ? "  [#ce93d8]COMBO" : "")).row();
                        tbl.button(tr("Open", "Abrir"), Icon.book, function(){
                            dialog.hide();
                            showBlockResearchDialog(g, category);
                        }).size(Vars.mobile ? 140 : 160, 40).padTop(2);
                    }).growX().padBottom(3).row();
                }
            })(filtered[j]);
        }
    }

    dialog.addCloseButton();
    dialog.cont.table(Styles.none, function(top){
        top.defaults().growX();
        top.add("[accent]" + crumb(["New Tech's", catLabel(category)])).padBottom(4).row();
        top.add("[lightgray]" + tr("Open a block to research its upgrades. Filters help when the list is long.", "Abra um bloco para pesquisar as melhorias. Filtros ajudam quando a lista e grande.")).wrap().padBottom(4).row();
        top.table(Styles.none, function(nav){
            nav.button(tr("Back", "Voltar"), Icon.left, function(){
                dialog.hide();
                showResearchDialog();
            }).size(Vars.mobile ? 100 : 120, 40).padRight(4);
            nav.button(uiCompactMode ? tr("Detail", "Detalhe") : tr("Compact", "Compacto"), function(){
                uiCompactMode = !uiCompactMode;
                saveUiPrefs();
                rebuild();
                dialog.hide();
                showCategoryDialog(category);
            }).size(Vars.mobile ? 100 : 110, 40);
        }).growX().row();
        top.table(Tex.underline, function(search){
            search.image(Icon.zoom).size(20).pad(3);
            var field = search.field("", function(txt){ query.v = txt == null ? "" : txt; rebuild(); }).growX().height(36).get();
            field.setMessageText(tr("Search...", "Pesquisar..."));
        }).growX().height(42).pad(2).row();
        // Filter chips
        top.table(Styles.none, function(chips){
            var filters = [
                {id:"all", en:"All", pt:"Todos"},
                {id:"favorites", en:"★", pt:"★"},
                {id:"researchable", en:"Can afford", pt:"Com recursos"},
                {id:"almost", en:"Almost", pt:"Quase"},
                {id:"mission", en:"Mission", pt:"Missao"}
            ];
            for(var fi = 0; fi < filters.length; fi++){
                (function(f){
                    var sel = uiBlockFilter === f.id;
                    chips.button((sel ? "[accent]" : "") + tr(f.en, f.pt), function(){
                        uiBlockFilter = f.id;
                        saveUiPrefs();
                        rebuild();
                    }).height(32).pad(2);
                })(filters[fi]);
            }
        }).growX().padBottom(4).row();
    }).growX().row();
    var catPane = dialog.cont.pane(list).grow().pad(6).get();
    rebuild();
    dialog.show();
    var catScrollKey = "cat-" + category;
    try{
        var cy = uiScrollGet(catScrollKey);
        Core.app.post(function(){ try{ if(catPane != null) catPane.setScrollY(cy); }catch(e){} });
        Timer.schedule(function(){
            try{ if(catPane != null) uiScrollSet(catScrollKey, catPane.getScrollY()); }catch(e2){}
        }, 0.4);
    }catch(eC){}
}

function categoryBlockCount(category){
    ensureCatalogBuilt();
    var groups = CATEGORY_GROUPS[category] || [];
    var count = 0;
    for(var i = 0; i < groups.length; i++) if(groupVisible(groups[i])) count++;
    return count;
}



// ---------- History ----------
function currentUserName(){
    try{
        if(Vars.player != null && Vars.player.name != null) return "" + Vars.player.name;
    }catch(e){}
    return "local";
}

function loadHistory(){
    try{
        var s = Core.settings.getString(HISTORY_KEY, "[]");
        upgradeHistory = JSON.parse(s);
        if(upgradeHistory == null || !(upgradeHistory instanceof Array)) upgradeHistory = [];
    }catch(e){ upgradeHistory = []; }
}

function saveHistory(){
    try{
        while(upgradeHistory.length > HISTORY_MAX) upgradeHistory.shift();
        Core.settings.put(HISTORY_KEY, JSON.stringify(upgradeHistory));
    }catch(e){}
}

function pushHistory(entry){
    try{
        entry.t = Time != null ? Time.millis() : java.lang.System.currentTimeMillis();
        if(entry.user == null) entry.user = currentUserName();
        upgradeHistory.push(entry);
        saveHistory();
    }catch(e){}
}

function minutesAgo(ms){
    try{
        var now = Time != null ? Time.millis() : java.lang.System.currentTimeMillis();
        var d = Math.max(0, (now - ms) / 60000);
        if(d < 1) return tr("< 1 min", "< 1 min");
        return Math.floor(d) + " " + tr("min ago", "min atras");
    }catch(e){ return "?"; }
}

function showHistoryDialog(){
    loadHistory();
    var dialog = new BaseDialog(tr("HISTORY", "HISTORICO"));
    dialog.addCloseButton();
    var body = new Table();
    body.defaults().pad(4).growX();
    if(upgradeHistory.length === 0){
        body.add("[lightgray]" + tr("No upgrades recorded yet.", "Nenhuma melhoria registrada ainda.")).pad(12).row();
    }else{
        for(var i = upgradeHistory.length - 1; i >= 0; i--){
            (function(e){
                body.table(Tex.button, function(tbl){
                    tbl.left().defaults().left().pad(2);
                    tbl.add("[accent]" + (e.user || "?") + "  [gray]" + minutesAgo(e.t)).growX().row();
                    tbl.add("[white]" + (e.action || "")).growX().wrap().row();
                    tbl.add("[lightgray]" + (e.block || "?") + (e.pos ? ("  @ " + e.pos) : "")).growX().wrap().row();
                    if(e.detail) tbl.add("[gray]" + e.detail).growX().wrap().row();
                }).growX().row();
            })(upgradeHistory[i]);
        }
    }
    dialog.cont.pane(body).grow().pad(6);
    dialog.show();
}

// ---------- Multiplayer sync ----------
function buildSyncPayload(includeApplied){
    ensurePersistentState();
    var o = { v: 2, levels: persistentLevels, partial: persistentPartial };
    if(includeApplied !== false){
        o.applied = appliedMap || {};
    }
    return JSON.stringify(o);
}

function applySyncPayload(str){
    try{
        var data = JSON.parse(str);
        if(data == null || data.levels == null) return;
        ensurePersistentState();
        // Host/client merge: take max level per id
        var ids = Object.keys(data.levels);
        for(var i = 0; i < ids.length; i++){
            var id = ids[i];
            var incoming = data.levels[id]|0;
            var cur = persistentLevels[id]|0;
            if(incoming > cur) persistentLevels[id] = incoming;
        }
        if(data.partial != null){
            var pids = Object.keys(data.partial);
            for(var j = 0; j < pids.length; j++){
                if(persistentPartial[pids[j]] == null) persistentPartial[pids[j]] = data.partial[pids[j]];
            }
        }
        // Merge per-building installs so upgrade sprites show for all clients
        if(data.applied != null){
            try{
                if(appliedMap == null) appliedMap = {};
                var akeys = Object.keys(data.applied);
                for(var ai = 0; ai < akeys.length; ai++){
                    var tk = akeys[ai];
                    var incoming = data.applied[tk];
                    if(incoming == null) continue;
                    if(appliedMap[tk] == null) appliedMap[tk] = {};
                    var uids = Object.keys(incoming);
                    for(var ui = 0; ui < uids.length; ui++){
                        var uid = uids[ui];
                        var inv = incoming[uid]|0;
                        var curA = appliedMap[tk][uid]|0;
                        if(inv > curA) appliedMap[tk][uid] = inv;
                    }
                }
                try{ saveAppliedMap(); }catch(eSA){}
                anyBoostActive = true;
            }catch(eApp){ Log.err("New Tech's applied sync: " + eApp); }
        }
        savePersistentState(false);
        masterActivationKey = null;
        refreshGlobalBoostRanks();
        try{ activateResearchedMasters(); }catch(e){}
        try{ applyAllBulletUpgrades(); }catch(e2){}
        anyBoostActive = true;
        lastScanTick = -1000;
        try{ rescanBoostTargets(); }catch(eRS){}
        Log.info("New Tech's: sync applied (" + ids.length + " levels)");
    }catch(err){ Log.err("New Tech's sync apply: " + err); }
}

function writeHostTags(){
    try{
        if(Vars.state != null && Vars.state.rules != null && Vars.state.rules.tags != null){
            Vars.state.rules.tags.put("newtechs-sync-v1", buildSyncPayload(false));
        }
    }catch(e){}
}

function readHostTags(){
    try{
        if(Vars.state != null && Vars.state.rules != null && Vars.state.rules.tags != null){
            var s = Vars.state.rules.tags.get("newtechs-sync-v1");
            if(s != null && (""+s).length > 2) applySyncPayload(""+s);
        }
    }catch(e){}
}

function broadcastSync(){
    try{
        writeHostTags();
        var payload = buildSyncPayload();
        if(Vars.net != null && Vars.net.server()){
            Groups.player.each(function(p){
                try{
                    if(p != null && p.con != null) Call.clientPacketReliable(p.con, NET_PACKET, payload);
                }catch(e1){}
            });
        }
    }catch(e){}
}

function requestSyncFromHost(){
    try{
        if(Vars.net != null && Vars.net.client()){
            Call.serverPacketReliable(NET_PACKET, "req");
        }
        readHostTags();
    }catch(e){}
}

function setupNetHandlers(){
    try{
        if(Vars.netServer != null && Vars.netServer.addPacketHandler != null){
            Vars.netServer.addPacketHandler(NET_PACKET, function(player, str){
                try{
                    if(str == null) return;
                    str = "" + str;
                    if(str === "req"){
                        if(player != null && player.con != null){
                            Call.clientPacketReliable(player.con, NET_PACKET, buildSyncPayload());
                        }
                    }else{
                        applySyncPayload(str);
                        broadcastSync();
                    }
                }catch(e){}
            });
            Vars.netServer.addPacketHandler("newtechs-shop", function(player, str){
                try{
                    if(player == null || str == null) return;
                    var data = null;
                    try{ data = JSON.parse(""+str); }catch(eJ){ return; }
                    if(data == null) return;
                    if(data.op === "gift"){
                        var gr = hostFulfillGift(player, data);
                        try{ if(player.con != null) Call.clientPacketReliable(player.con, "newtechs-shop", JSON.stringify(gr)); }catch(eG){}
                        return;
                    }
                    if(data.op !== "buy") return;
                    var result = hostFulfillShopBuy(player, data);
                    try{
                        if(player.con != null){
                            Call.clientPacketReliable(player.con, "newtechs-shop", JSON.stringify(result));
                        }
                    }catch(eR){}
                }catch(e){ Log.err("New Tech's shop host: " + e); }
            });
        }
    }catch(e){}
    try{
        if(Vars.netClient != null && Vars.netClient.addPacketHandler != null){
            Vars.netClient.addPacketHandler(NET_PACKET, function(str){
                try{ applySyncPayload(""+str); }catch(e){}
            });
            Vars.netClient.addPacketHandler("newtechs-shop", function(str){
                try{
                    var data = JSON.parse(""+str);
                    if(data == null) return;
                    if(data.ok){
                        try{
                            if(data.shop != null){
                                saveGlobalShop(data.shop);
                                persistentShop = data.shop;
                            }
                        }catch(eS){}
                        try{ quietInfo(tr("Purchase received!", "Compra recebida!")); }catch(eI){}
                    }else{
                        if(data.refund > 0) addPoints(data.refund|0);
                        try{ quietInfo(data.msg != null ? (""+data.msg) : tr("Purchase failed.", "Compra falhou.")); }catch(eI2){}
                    }
                }catch(e){}
            });
        }
    }catch(e2){}
}

function hostFulfillGift(fromPlayer, data){
    try{
        var target = null;
        Groups.player.each(function(p){
            if(p != null && (p.id|0) === (data.targetId|0)) target = p;
        });
        if(target == null) return {ok:false, refund:data.cost|0, msg:tr("Ally not found.", "Aliado nao encontrado.")};
        if(fromPlayer.team() !== target.team()) return {ok:false, refund:data.cost|0, msg:tr("Not same team.", "Nao e o mesmo time.")};
        var item = Vars.content.item(data.item);
        if(item == null) return {ok:false, refund:data.cost|0, msg:tr("Unknown item.", "Item desconhecido.")};
        var amt = data.amount|0;
        if(amt <= 0) amt = 1;
        if(!giveItemsToTeam(target.team(), item, amt, target)){
            return {ok:false, refund:data.cost|0, msg:tr("No core.", "Sem nucleo.")};
        }
        return {ok:true};
    }catch(e){ return {ok:false, refund:data.cost|0, msg:tr("Server error.", "Erro no servidor.")}; }
}

function hostFulfillShopBuy(player, data){
    try{
        ensurePointSystems();
        if(!shopClientsAllowed()){
            return {ok:false, refund:data.cost|0, msg:tr("Host disabled shop for clients.", "Host desativou a loja para clients.")};
        }
        var kind = data.kind === "unit" ? "unit" : "item";
        var index = data.index|0;
        var g = loadGlobalShop();
        if(g == null) return {ok:false, refund:data.cost|0, msg:tr("Shop unavailable.", "Loja indisponivel.")};
        var slots = kind === "unit" ? g.unitSlots : g.itemSlots;
        if(slots == null || index < 0 || index >= slots.length) return {ok:false, refund:data.cost|0, msg:tr("Invalid slot.", "Slot invalido.")};
        var slot = slots[index];
        // Name fallback if client/host index drifted
        if(slot == null || (data.name != null && slot.name != null && (""+slot.name) !== (""+data.name))){
            try{
                for(var si = 0; si < slots.length; si++){
                    if(slots[si] != null && data.name != null && (""+slots[si].name) === (""+data.name)){
                        slot = slots[si]; index = si; break;
                    }
                }
            }catch(eF){}
        }
        if(slot == null) return {ok:false, refund:data.cost|0, msg:tr("Empty slot.", "Slot vazio.")};
        if((slot.stock|0) <= 0) return {ok:false, refund:data.cost|0, msg:tr("Out of stock.", "Fora de estoque.")};

        if(slot.kind === "item"){
            var item = Vars.content.item(slot.name);
            if(item == null) return {ok:false, refund:data.cost|0, msg:tr("Unknown item.", "Item desconhecido.")};
            var amt = slot.amount|0;
            if(amt <= 0) amt = 1;
            if(!giveItemsToTeam(player.team(), item, amt, player)){
                return {ok:false, refund:data.cost|0, msg:tr("No core to receive items.", "Sem nucleo para receber itens.")};
            }
        }else if(slot.kind === "unit"){
            var ut = Vars.content.unit(slot.name);
            if(ut == null) return {ok:false, refund:data.cost|0, msg:tr("Unknown unit.", "Unidade desconhecida.")};
            if(!spawnUnitNearPlayer(ut, player)){
                return {ok:false, refund:data.cost|0, msg:tr("Could not spawn unit.", "Nao foi possivel criar a unidade.")};
            }
        }else{
            return {ok:false, refund:data.cost|0, msg:tr("Invalid product.", "Produto invalido.")};
        }
        slot.stock = (slot.stock|0) - 1;
        if(slot.stock < 0) slot.stock = 0;
        saveGlobalShop(g);
        persistentShop = g;
        return {ok:true, shop:g};
    }catch(e){
        Log.err("hostFulfillShopBuy: " + e);
        return {ok:false, refund:data.cost|0, msg:tr("Server error.", "Erro no servidor.")};
    }
}

function giveItemsToTeam(team, item, amount, player){
    if(team == null || item == null || amount <= 0) return false;
    try{
        var core = null;
        try{ if(player != null) core = player.core(); }catch(e0){}
        if(core == null){
            try{ core = team.core(); }catch(e1){}
        }
        if(core != null && core.items != null){
            try{ core.items.add(item, amount); return true; }catch(e2){}
            try{ core.handleStack(item, amount, player != null ? player.unit() : null); return true; }catch(e3){}
        }
        try{
            if(team.cores != null){
                for(var i = 0; i < team.cores.size; i++){
                    var c = team.cores.get(i);
                    if(c == null || c.items == null) continue;
                    try{ c.items.add(item, amount); return true; }catch(e4){}
                }
            }
        }catch(e5){}
    }catch(e){}
    return false;
}

function spawnUnitNearPlayer(unitType, player){
    try{
        if(unitType == null || player == null) return false;
        var team = player.team();
        var px = player.x, py = player.y;
        var bestX = px, bestY = py, bestScore = -1e9;
        for(var r = 0; r <= 16; r++){
            for(var dx = -r; dx <= r; dx++){
                for(var dy = -r; dy <= r; dy++){
                    if(r > 0 && Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                    var tile = Vars.world.tile((px/8+dx)|0, (py/8+dy)|0);
                    if(tile == null) continue;
                    try{ if(tile.solid()) continue; }catch(eS){}
                    try{ if(tile.floor() != null && tile.floor().isDeep()) continue; }catch(eD){}
                    var score = 50 - (Math.abs(dx)+Math.abs(dy));
                    if(score > bestScore){ bestScore = score; bestX = tile.worldx(); bestY = tile.worldy(); }
                }
            }
        }
        var unit = null;
        try{ unit = unitType.spawn(team, bestX, bestY); }catch(e1){}
        if(unit == null){
            try{
                unit = unitType.create(team);
                if(unit != null){ unit.set(bestX, bestY); unit.add(); }
            }catch(e2){}
        }
        return unit != null;
    }catch(e){ return false; }
}

// ---------- Bullet upgrades (global, no install) ----------
function isItemBulletTurret(b){
    if(b == null) return false;
    try{
        if(b.ammoTypes != null && b.ammoTypes.size > 0) return true;
    }catch(e){}
    try{
        var cls = classNameOf(b).toLowerCase();
        if(cls.indexOf("itemturret") >= 0) return b.ammoTypes != null;
    }catch(e2){}
    try{
        return b instanceof Packages.mindustry.world.blocks.defense.turrets.ItemTurret;
    }catch(e3){}
    return false;
}
function isShootTypeTurret(b){
    if(b == null) return false;
    try{
        if(b.shootType != null && (b.ammoTypes == null || b.ammoTypes.size <= 0)) return true;
    }catch(e){}
    try{
        var cls = classNameOf(b).toLowerCase();
        if(cls.indexOf("powerturret") >= 0 || cls.indexOf("liquidturret") >= 0) return true;
    }catch(e2){}
    return false;
}
function isAnyBulletTurret(b){
    return isItemBulletTurret(b) || isShootTypeTurret(b);
}

/** Focus list — only these turrets get bullet upgrades while system is in test. */
var BULLET_TEST_TURRETS = {
    "duo": true
};
function isBulletTestTurret(b){
    if(b == null || b.name == null) return false;
    return !!BULLET_TEST_TURRETS[(""+b.name).toLowerCase()];
}


function unitHasGuns(u){
    if(u == null) return false;
    try{
        if(u.weapons == null || u.weapons.size <= 0) return false;
        return true;
    }catch(e){ return false; }
}

function bulletId(prefix, name, kind){
    return "bullet-" + safePart(prefix + "-" + name + "-" + kind);
}



// ========== Bullet config (JSON) + runtime spawn (JS) ==========
// data/bullets.json = stats / rules. JavaScript only creates/spawns bullets.
var BULLET_CONFIG = null;

function loadBulletConfig(){
    if(BULLET_CONFIG != null) return BULLET_CONFIG;
    BULLET_CONFIG = { version: 1, turrets: { duo: {
        enabled: true,
        extraBullets: { useResearchOrInstall: true, perRank: 1, maxExtras: 3, spreadDegrees: 4.0, sizeScalePerRank: 0.14 },
        ammo: { scaleSizeOnly: true, restoreCombatStats: true }
    }}};
    try{
        var mod = null;
        try{ mod = Vars.mods.locateMod("new-techs"); }catch(e0){}
        if(mod == null){
            try{
                Vars.mods.each(function(m){
                    if(mod == null && m != null && m.meta != null && (""+m.meta.name).toLowerCase().indexOf("new-tech") >= 0) mod = m;
                });
            }catch(e1){}
        }
        if(mod != null && mod.root != null){
            var f = mod.root.child("data/bullets.json");
            if(f != null && f.exists()){
                var raw = f.readString();
                if(raw != null && (""+raw).length > 5){
                    var parsed = JSON.parse(""+raw);
                    if(parsed != null) BULLET_CONFIG = parsed;
                }
            }
        }
    }catch(e){
        try{ Log.warn("New Tech's: bullets.json load failed: " + e); }catch(e2){}
    }
    return BULLET_CONFIG;
}

function turretBulletCfg(blockName){
    var cfg = loadBulletConfig();
    try{
        if(cfg != null && cfg.turrets != null && cfg.turrets[blockName] != null)
            return cfg.turrets[blockName];
    }catch(e){}
    return null;
}

// ========== DUO bullet variants (test focus) ==========
// One independent variation chain PER ammo item on Blocks.duo.
var duoAmmoOriginals = null; // { itemName: {damage,speed,lifetime,pierce,splash,splashR, ref: BulletType} }
var duoVariantsReady = false;
var duoLastAppliedRank = -1;

function snapshotDuoAmmoOriginals(){
    if(duoAmmoOriginals != null) return duoAmmoOriginals;
    duoAmmoOriginals = {};
    try{
        var duo = Blocks.duo;
        if(duo == null || duo.ammoTypes == null) return duoAmmoOriginals;
        var it = duo.ammoTypes.entries();
        while(it.hasNext()){
            var e = it.next();
            var item = e.key;
            var bt = e.value;
            if(item == null || bt == null) continue;
            var n = ""+item.name;
            duoAmmoOriginals[n] = {
                item: item,
                ref: bt,
                damage: bt.damage,
                speed: bt.speed,
                lifetime: bt.lifetime,
                pierce: 0,
                splash: 0,
                splashR: 0
            };
            try{ if(bt.pierceCap != null) duoAmmoOriginals[n].pierce = bt.pierceCap|0; }catch(eP){}
            try{ if(bt.splashDamage != null) duoAmmoOriginals[n].splash = bt.splashDamage; }catch(eS){}
            try{ if(bt.splashDamageRadius != null) duoAmmoOriginals[n].splashR = bt.splashDamageRadius; }catch(eR){}
        }
        Log.info("New Tech's: Duo ammo originals = " + Object.keys(duoAmmoOriginals).join(", "));
    }catch(e){ Log.err("New Tech's duo snapshot: " + e); }
    return duoAmmoOriginals;
}

/** Apply rank 0..5 onto each Duo ammo BulletType IN PLACE from originals (cheap, no clone spam). */
function applyDuoAmmoRank(rank){
    // Stats from data/bullets.json; JS only mutates size (optional) — extras spawn at runtime.
    rank = rank|0;
    if(rank < 0) rank = 0;
    if(rank > 5) rank = 5;
    if(rank === duoLastAppliedRank && duoVariantsReady) return;
    var tcfg = turretBulletCfg("duo");
    var sizeScale = 0.14;
    var sizeOnly = true;
    try{
        if(tcfg != null && tcfg.extraBullets != null && tcfg.extraBullets.sizeScalePerRank != null)
            sizeScale = tcfg.extraBullets.sizeScalePerRank;
        if(tcfg != null && tcfg.ammo != null && tcfg.ammo.scaleSizeOnly === false) sizeOnly = false;
    }catch(eC){}
    var originals = snapshotDuoAmmoOriginals();
    var keys = Object.keys(originals);
    for(var i = 0; i < keys.length; i++){
        var n = keys[i];
        var o = originals[n];
        if(o == null || o.ref == null) continue;
        var bt = o.ref;
        // Restore combat stats to vanilla baseline
        try{ bt.damage = o.damage; }catch(eD){}
        try{ if(o.speed != null) bt.speed = o.speed; }catch(eV){}
        try{ if(o.lifetime != null) bt.lifetime = o.lifetime; }catch(eL){}
        // Size from JSON scale
        var sm = 1 + sizeScale * rank;
        try{ if(o.width > 0) bt.width = o.width * sm; }catch(eW){}
        try{ if(o.height > 0) bt.height = o.height * sm; }catch(eH){}
        try{ if(bt.hitSize != null && o.width > 0) bt.hitSize = o.width * sm * 0.5; }catch(eHS){}
    }
    duoLastAppliedRank = rank;
    duoVariantsReady = true;
}


function duoResearchRank(){
    try{
        var dmg = levelOf(bulletId("turret", "duo", "dmg"))|0;
        var vel = levelOf(bulletId("turret", "duo", "vel"))|0;
        var prc = levelOf(bulletId("turret", "duo", "pierce"))|0;
        var spl = levelOf(bulletId("turret", "duo", "splash"))|0;
        var rof = levelOf(bulletId("turret", "duo", "rof"))|0;
        var rng = levelOf(bulletId("turret", "duo", "range"))|0;
        var m = Math.max(dmg, Math.max(vel, Math.max(prc, Math.max(spl, Math.max(rof, rng)))));
        return Math.max(0, Math.min(5, m));
    }catch(e){ return 0; }
}

function duoBuildingInstallRank(build){
    if(build == null || build.block == null) return 0;
    if((""+build.block.name) !== "duo") return 0;
    var dmg = getApplied(build, bulletId("turret", "duo", "dmg"))|0;
    var vel = getApplied(build, bulletId("turret", "duo", "vel"))|0;
    var prc = getApplied(build, bulletId("turret", "duo", "pierce"))|0;
    var spl = getApplied(build, bulletId("turret", "duo", "splash"))|0;
    var rof = getApplied(build, bulletId("turret", "duo", "rof"))|0;
    var rng = getApplied(build, bulletId("turret", "duo", "range"))|0;
    var m = Math.max(dmg, Math.max(vel, Math.max(prc, Math.max(spl, Math.max(rof, rng)))));
    return Math.max(0, Math.min(5, m));
}

// Stubs so old call sites do not crash
function cloneBulletType(src){ return null; }
function ensureTurretBulletVariants(block){
    if(block != null && (""+block.name) === "duo") snapshotDuoAmmoOriginals();
}
function applyInstalledVariantsToTurretBlock(block, rank){
    if(block != null && (""+block.name) === "duo") applyDuoAmmoRank(rank);
}
function maxInstalledBulletRankForType(block){
    if(block != null && (""+block.name) === "duo") return duoResearchRank();
    return 0;
}
function pickVariantForInstall(){ return null; }

function captureBulletType(bt){
    if(bt == null) return null;
    var o = {damage: bt.damage, lifetime: bt.lifetime, speed: bt.speed, pierce: 0, splashDamage: 0, splashDamageRadius: 0};
    try{ if(bt.pierceCap != null) o.pierce = bt.pierceCap; }catch(e){}
    try{ if(bt.splashDamage != null) o.splashDamage = bt.splashDamage; }catch(e2){}
    try{ if(bt.splashDamageRadius != null) o.splashDamageRadius = bt.splashDamageRadius; }catch(e3){}
    return o;
}
function applyCapturedToBulletType(bt, base, dmgMul, velMul, rngMul, pierceAdd, splashMul){
    if(bt == null || base == null) return;
    try{ bt.damage = base.damage * dmgMul; }catch(e){}
    try{ if(base.speed != null) bt.speed = base.speed * velMul; }catch(e2){}
    try{ if(base.lifetime != null) bt.lifetime = base.lifetime * rngMul; }catch(e3){}
    try{
        if(pierceAdd > 0){
            bt.pierce = true;
            bt.pierceCap = (base.pierce|0) + pierceAdd;
        }
    }catch(e4){}
    try{
        if(splashMul > 1 && base.splashDamage > 0){
            bt.splashDamage = base.splashDamage * splashMul;
            if(base.splashDamageRadius > 0) bt.splashDamageRadius = base.splashDamageRadius * (1 + (splashMul - 1) * 0.5);
        }
    }catch(e5){}
}
function ensureBulletSnapshotTurret(block){
    var key = "t:" + block.name;
    if(bulletBaseSnapshot[key] != null) return bulletBaseSnapshot[key];
    var snap = {reload: block.reload, range: block.range, ammo: {}, shootType: null};
    try{
        if(block.ammoTypes != null){
            var entries = block.ammoTypes.entries();
            while(entries.hasNext()){
                var e = entries.next();
                var item = e.key;
                var bt = e.value;
                if(item == null || bt == null) continue;
                snap.ammo[""+item.name] = captureBulletType(bt);
            }
        }
    }catch(e){}
    try{ if(block.shootType != null) snap.shootType = captureBulletType(block.shootType); }catch(e2){}
    bulletBaseSnapshot[key] = snap;
    return snap;
}

function ensureBulletSnapshotUnit(unitType){
    var key = "u:" + unitType.name;
    if(bulletBaseSnapshot[key] != null) return bulletBaseSnapshot[key];
    var snap = {weapons: []};
    try{
        for(var i = 0; i < unitType.weapons.size; i++){
            var w = unitType.weapons.get(i);
            if(w == null || w.bullet == null){ snap.weapons.push(null); continue; }
            var cap = captureBulletType(w.bullet);
            if(cap != null) cap.reload = w.reload;
            snap.weapons.push(cap);
        }
    }catch(e){}
    bulletBaseSnapshot[key] = snap;
    return snap;
}

function makeBulletUp(id, targetFn, kind, nameEn, namePt, descEn, descPt, costFn, needsInstall){
    var u = makeUp(id, targetFn, 5, costFn, nameEn, namePt, descEn, descPt, "bullet " + kind);
    u.globalResearch = !needsInstall;
    u.bulletKind = kind;
    u.bulletTarget = targetFn;
    u.bulletNeedsInstall = !!needsInstall;
    u.system = needsInstall ? "turret" : "unit";
    return u;
}

function addBulletGroupForTurret(block){
    var name = "" + block.name;
    var loc = block.localizedName;
    var group = {
        titleEn: loc + " (Bullets — install)",
        titlePt: loc + " (Tiros — instalar)",
        dynamicTitle: true,
        block: function(){ return block; },
        upgrades: [],
        category: "bullet",
        planet: planetKeyForBlock(block),
        bulletGroup: true
    };
    var kinds = [
        {k:"dmg", en:"Heavier Rounds", pt:"Projetéis Pesados",
            deEn:"+12% bullet damage / rank. Fire rate slows slightly.", dePt:"+12% dano do tiro / nivel. Cadencia um pouco mais lenta."},
        {k:"rof", en:"Faster Cycle", pt:"Ciclo Mais Rapido",
            deEn:"+8% fire rate / rank. Slight damage trade-off.", dePt:"+8% cadencia / nivel. Leve perda de dano."},
        {k:"range", en:"Longer Barrel", pt:"Cano Mais Longo",
            deEn:"+6% range / rank.", dePt:"+6% alcance / nivel."},
        {k:"vel", en:"Hotter Propellant", pt:"Propulsao Mais Quente",
            deEn:"+7% bullet speed / rank.", dePt:"+7% velocidade do projetil / nivel."},
        {k:"pierce", en:"Piercing Tips", pt:"Pontas Perfurantes",
            deEn:"+1 pierce cap / rank (when supported).", dePt:"+1 perfuração / nivel (quando suportado)."},
        {k:"splash", en:"Fragmentation", pt:"Fragmentacao",
            deEn:"+15% splash damage / rank if the ammo already splashes.", dePt:"+15% dano em area / nivel se a municao ja explode."}
    ];
    for(var i = 0; i < kinds.length; i++){
        (function(spec, index){
            var id = bulletId("turret", name, spec.k);
            if(UPGRADES[id] == null){
                UPGRADES[id] = makeBulletUp(id, function(){ return block; }, spec.k,
                    loc + " — " + spec.en, loc + " — " + spec.pt,
                    spec.deEn, spec.dePt,
                    function(lv){ return [[Items.copper, 80 + index * 40 + lv * 60],[Items.lead, 50 + index * 25 + lv * 40],[Items.graphite, 20 + index * 15 + lv * 25]]; }, true);
            }
            group.upgrades.push(id);
        })(kinds[i], i);
    }
    GROUPS.push(group);
    BLOCK_GROUPS["bullet-turret-" + name] = group;
    if(CATEGORY_GROUPS["bullet"] == null) CATEGORY_GROUPS["bullet"] = [];
    CATEGORY_GROUPS["bullet"].push(group);
}

function addBulletGroupForUnit(unitType){
    var name = "" + unitType.name;
    var loc = unitType.localizedName;
    var dummyBlock = Blocks.duo; // cost reference only
    var group = {
        titleEn: loc + " (Unit Guns)",
        titlePt: loc + " (Armas da Unidade)",
        dynamicTitle: true,
        block: function(){ return dummyBlock; },
        unitType: unitType,
        upgrades: [],
        category: "bullet",
        planet: unitPlanetKey(unitType),
        bulletGroup: true,
        isUnitBullet: true
    };
    var kinds = [
        {k:"dmg", en:"Armor-Piercing Load", pt:"Carga Perfurante",
            deEn:"+15% weapon damage / rank.", dePt:"+15% dano da arma / nivel."},
        {k:"rof", en:"Servo Fire Rate", pt:"Cadencia dos Servos",
            deEn:"+12% weapon fire rate / rank.", dePt:"+12% cadencia / nivel."},
        {k:"vel", en:"Muzzle Velocity", pt:"Velocidade de Boca",
            deEn:"+10% bullet speed / rank.", dePt:"+10% velocidade do projetil / nivel."},
        {k:"pierce", en:"Sabot Rounds", pt:"Munição Sabot",
            deEn:"+1 pierce / rank when the weapon supports it.", dePt:"+1 perfuração / nivel quando a arma permite."},
        {k:"splash", en:"Airburst Fuse", pt:"Espoleta Airburst",
            deEn:"+12% splash / rank if weapon already has splash.", dePt:"+12% splash / nivel se a arma ja tem area."}
    ];
    for(var i = 0; i < kinds.length; i++){
        (function(spec, index){
            var id = bulletId("unit", name, spec.k);
            if(UPGRADES[id] == null){
                UPGRADES[id] = makeBulletUp(id, function(){ return dummyBlock; }, "unit-" + spec.k,
                    loc + " — " + spec.en, loc + " — " + spec.pt,
                    spec.deEn + " | Research applies to all units of this type.", spec.dePt + " | Pesquisa vale para todas unidades desse tipo.",
                    function(lv){ return [[Items.silicon, 40 + index * 30 + lv * 45],[Items.titanium, 30 + index * 25 + lv * 35],[Items.graphite, 40 + index * 20 + lv * 30]]; },
                    false);
                UPGRADES[id].unitName = name;
            }
            group.upgrades.push(id);
        })(kinds[i], i);
    }
    GROUPS.push(group);
    if(CATEGORY_GROUPS["bullet"] == null) CATEGORY_GROUPS["bullet"] = [];
    CATEGORY_GROUPS["bullet"].push(group);
}

function ammoRoleForItem(item){
    if(item == null || item.name == null) return "standard";
    var n = ("" + item.name).toLowerCase();
    if(n === "silicon" || n === "phase-fabric") return "guided";
    if(n === "graphite" || n === "carbide") return "piercing";
    if(n === "thorium" || n === "blast-compound") return "explosive";
    if(n === "pyratite" || n === "coal") return "incendiary";
    if(n === "plastanium" || n === "titanium" || n === "beryllium") return "fast";
    if(n === "surge-alloy" || n === "tungsten") return "heavy";
    if(n === "metaglass" || n === "oxide") return "stable";
    if(n === "copper" || n === "lead") return "standard";
    return "standard";
}

function copyUsefulBullet(base, role){
    if(base == null) return null;
    var bullet = null;
    try{
        // BulletType implements copy() in Mindustry. Use it so special projectile
        // classes (ArtilleryBulletType, RailBulletType, etc.) keep their native
        // behavior instead of mutating the original ammo projectile.
        if(typeof base.copy === "function") bullet = base.copy();
    }catch(copyErr){}
    if(bullet == null){
        try{
            var cname = classNameOf(base).toLowerCase();
            if(cname.indexOf("basicbullettype") >= 0){
                var BasicBulletType = Packages.mindustry.entities.bullet.BasicBulletType;
                bullet = new BasicBulletType(base.speed, Math.max(1, base.damage));
                bullet.width = base.width;
                bullet.height = base.height;
                bullet.lifetime = base.lifetime;
                bullet.ammoMultiplier = Math.max(1, base.ammoMultiplier);
                bullet.reloadMultiplier = base.reloadMultiplier;
                bullet.knockback = base.knockback;
                bullet.homingPower = base.homingPower;
                bullet.homingRange = base.homingRange;
                bullet.pierce = base.pierce;
                bullet.pierceCap = base.pierceCap;
                bullet.pierceBuilding = base.pierceBuilding;
                bullet.collidesAir = base.collidesAir;
                bullet.collidesGround = base.collidesGround;
                bullet.collidesTiles = base.collidesTiles;
                bullet.splashDamage = base.splashDamage;
                bullet.splashDamageRadius = base.splashDamageRadius;
                bullet.status = base.status;
                bullet.statusDuration = base.statusDuration;
                bullet.rangeChange = base.rangeChange;
                bullet.velocityRnd = base.velocityRnd;
            }
        }catch(fallbackErr){}
    }
    if(bullet == null) return null;
    try{
        if(role === "guided"){
            bullet.speed = (bullet.speed || 1) * 1.12;
            bullet.homingPower = Math.max(bullet.homingPower || 0, 0.10);
            bullet.homingRange = Math.max(bullet.homingRange || 0, 60);
            bullet.damage = Math.max(1, bullet.damage * 0.98);
        }else if(role === "piercing"){
            bullet.damage = Math.max(1, bullet.damage * 1.18);
            bullet.pierce = true;
            bullet.pierceCap = Math.max(bullet.pierceCap || 0, 2);
            bullet.pierceBuilding = true;
        }else if(role === "explosive"){
            bullet.damage = Math.max(1, bullet.damage * 1.08);
            bullet.splashDamage = Math.max(bullet.splashDamage || 0, bullet.damage * 0.55);
            bullet.splashDamageRadius = Math.max(bullet.splashDamageRadius || 0, 18);
        }else if(role === "incendiary"){
            bullet.damage = Math.max(1, bullet.damage * 0.96);
            try{ bullet.status = StatusEffects.burning; bullet.statusDuration = Math.max(bullet.statusDuration || 0, 90); }catch(eBurn){}
        }else if(role === "fast"){
            bullet.speed = (bullet.speed || 1) * 1.18;
            bullet.damage = Math.max(1, bullet.damage * 0.96);
        }else if(role === "heavy"){
            bullet.damage = Math.max(1, bullet.damage * 1.28);
            bullet.speed = (bullet.speed || 1) * 0.92;
        }else if(role === "stable"){
            bullet.damage = Math.max(1, bullet.damage * 1.10);
            bullet.knockback = (bullet.knockback || 0) + 0.3;
        }
    }catch(roleErr){}
    return bullet;
}

function chooseAmmoSourceItem(block, newItem, role){
    if(block == null || block.ammoTypes == null) return null;
    var data = null;
    try{ data = NewTechAmmo.capture(block); }catch(e0){ data = null; }
    var bestItem = null, bestScore = -999999;
    try{
        var list = data != null ? data.items : null;
        if(list != null){
            for(var li = 0; li < list.length; li++){
                var pair = list[li];
                var item = pair.item;
                var bt = pair.bullet;
                if(item == null || bt == null) continue;
                var score = 0;
                var cls = classNameOf(bt).toLowerCase();
                if(role === "guided") score += (bt.homingPower || 0) > 0 ? 50 : 0;
                if(role === "piercing") score += bt.pierce ? 50 : 0;
                if(role === "explosive") score += ((bt.splashDamage || 0) > 0 ? 40 : 0) + (cls.indexOf("artillery") >= 0 ? 20 : 0) + (cls.indexOf("flak") >= 0 ? 15 : 0);
                if(role === "incendiary") score += (bt.makeFire ? 45 : 0) + (bt.status === StatusEffects.burning ? 35 : 0);
                if(role === "fast") score += Math.max(0, Math.round((bt.speed || 0) * 2));
                if(role === "heavy") score += Math.max(0, Math.round((bt.damage || 0) * 2));
                if(role === "stable") score += Math.max(0, Math.round((bt.knockback || 0) * 4));
                if(cls.indexOf("rail") >= 0) score += 25;
                if(cls.indexOf("missile") >= 0 && role === "guided") score += 20;
                if(score > bestScore){ bestScore = score; bestItem = item; }
            }
        }
    }catch(e){}
    if(bestItem != null) return bestItem;
    try{
        if(data != null && data.items.length > 0) return data.items[0].item;
    }catch(e2){}
    try{
        var keys = block.ammoTypes.keys();
        if(keys != null && keys.hasNext()) return keys.next();
    }catch(e3){}
    return null;
}

function markAmmoItemAccepted(block, item){
    if(block == null) return;
    try{
        // Prefer Java rebuild of itemFilter from the full ammoTypes map (PatchEditor-style live edit)
        var JC = javaAmmoTurretClass();
        if(JC != null && JC.rebuildItemFilter != null){
            JC.rebuildItemFilter(block);
            return;
        }
    }catch(eJ){}
    try{
        block.hasItems = true;
        block.acceptsItems = true;
        var size = Vars.content.items().size;
        if(block.itemFilter == null || block.itemFilter.length < size){
            block.itemFilter = [];
            for(var i = 0; i < size; i++) block.itemFilter[i] = false;
        }
        // Mark every item currently in ammoTypes (live map)
        if(block.ammoTypes != null){
            var it = block.ammoTypes.entries();
            while(it.hasNext()){
                var e = it.next();
                if(e.key != null && e.key.id >= 0) block.itemFilter[e.key.id] = true;
            }
        }else if(item != null && item.id >= 0){
            block.itemFilter[item.id] = true;
        }
    }catch(e){ Log.err("New Tech's ammo filter update failed: " + e); }
}

function cloneAmmoBullet(base, role){
    if(base == null) return null;
    var bullet = null;
    try{
        // BulletType.copy() performs a real clone of the original projectile,
        // preserving Artillery/Flak/Rail/Missile/etc. instead of downgrading it
        // to a generic BasicBulletType.
        bullet = base.copy();
    }catch(copyErr){
        Log.err("New Tech's bullet copy failed: " + copyErr);
        return null;
    }
    if(bullet == null) return null;
    try{
        if(role === "guided"){
            bullet.speed = Math.max(0.01, (bullet.speed || 1) * 1.10);
            bullet.homingPower = Math.max(bullet.homingPower || 0, 0.10);
            bullet.homingRange = Math.max(bullet.homingRange || 0, 60);
        }else if(role === "piercing"){
            bullet.damage = Math.max(1, (bullet.damage || 1) * 1.12);
            bullet.pierce = true;
            bullet.pierceCap = Math.max(bullet.pierceCap || 0, 2);
            bullet.pierceBuilding = true;
        }else if(role === "explosive"){
            bullet.damage = Math.max(1, (bullet.damage || 1) * 1.06);
            bullet.splashDamage = Math.max(bullet.splashDamage || 0, bullet.damage * 0.45);
            bullet.splashDamageRadius = Math.max(bullet.splashDamageRadius || 0, 16);
        }else if(role === "incendiary"){
            bullet.status = StatusEffects.burning;
            bullet.statusDuration = Math.max(bullet.statusDuration || 0, 90);
            bullet.makeFire = true;
        }else if(role === "fast"){
            bullet.speed = Math.max(0.01, (bullet.speed || 1) * 1.15);
        }else if(role === "heavy"){
            bullet.damage = Math.max(1, (bullet.damage || 1) * 1.22);
            bullet.speed = Math.max(0.01, (bullet.speed || 1) * 0.94);
        }else if(role === "stable"){
            bullet.damage = Math.max(1, (bullet.damage || 1) * 1.08);
            bullet.knockback = (bullet.knockback || 0) + 0.25;
        }
    }catch(roleErr){ Log.err("New Tech's ammo role failed: " + roleErr); }
    return bullet;
}

function addUsefulAmmoGlobal(block, item, sourceItem, role){
    if(block == null || item == null || block.ammoTypes == null) return false;
    try{
        try{
            var JC = javaAmmoTurretClass();
            if(JC != null && isItemBulletTurret(block)){
                JC.register(block, item, sourceItem, role || ammoRoleForItem(item));
                var javaOk = JC.unlock(block, item, sourceItem, role || ammoRoleForItem(item));
                if(javaOk) return true;
            }
        }catch(javaAmmoErr){ Log.err("New Tech's Java global ammo install failed on " + (block.name || "?") + ": " + javaAmmoErr); }
        if(block.ammoTypes.get(item) != null){
            markAmmoItemAccepted(block, item);
            return true;
        }
        var source = sourceItem != null ? sourceItem : chooseAmmoSourceItem(block, item, role || ammoRoleForItem(item));
        var base = source != null ? NewTechAmmo.originalBullet(block, source) : null;
        if(base == null) return false;
        var bullet = cloneAmmoBullet(base, role || ammoRoleForItem(item));
        if(bullet == null) return false;
        block.ammoTypes.put(item, bullet);
        markAmmoItemAccepted(block, item);
        var installed = block.ammoTypes.get(item);
        if(installed == null) return false;
        Log.info("New Tech's ammo installed: " + item.name + " -> " + classNameOf(installed) + " on " + block.name + " (source=" + (source != null ? source.name : "?") + ")");
        return true;
    }catch(e){
        Log.err("New Tech's ammo install failed for " + item + " on " + block + ": " + e);
        return false;
    }
}

function ammoUpgradeId(blockName, index){
    return "ammo-" + safePart(blockName) + "-" + (index + 1);
}

function ammoCandidateItems(block){
    // Prefer items not already in the turret ammo map. Mix Serpulo + Erekir pools.
    var candidates = [];
    try{
        candidates = [
            Items.silicon, Items.graphite, Items.thorium, Items.titanium, Items.metaglass,
            Items.pyratite, Items.plastanium, Items.blastCompound, Items.surgeAlloy,
            Items.copper, Items.lead, Items.coal
        ];
    }catch(e){}
    // Erekir items when present in content
    try{ if(Items.beryllium != null) candidates.push(Items.beryllium); }catch(e1){}
    try{ if(Items.tungsten != null) candidates.push(Items.tungsten); }catch(e2){}
    try{ if(Items.oxide != null) candidates.push(Items.oxide); }catch(e3){}
    try{ if(Items.carbide != null) candidates.push(Items.carbide); }catch(e4){}
    try{ if(Items.phaseFabric != null) candidates.push(Items.phaseFabric); }catch(e5){}
    var out = [];
    if(block == null || block.ammoTypes == null) return out;
    for(var i = 0; i < candidates.length && out.length < 8; i++){
        var item = candidates[i];
        try{
            if(item != null && block.ammoTypes.get(item) == null) out.push(item);
        }catch(e){}
    }
    return out;
}

var AMMO_GROUPS = {};
function refreshResearchEffectsNow(needBulletRefresh){
    try{
        ensureCatalogBuilt();
        refreshGlobalBoostRanks();
        masterActivationKey = null;
        activateResearchedMasters();
        // Ammo research has its own lightweight refresh path in setLevel().
        // A full bullet pass is now restricted to actual bullet/ammo research.
        if(needBulletRefresh){
            try{ applyAllBulletUpgrades(); }catch(eBullet){}
        }
        // Do not force a Groups.build full-map rescan from a UI click. Newly
        // installed local upgrades are inserted directly by setApplied(); global
        // targets are refreshed by the normal throttled update loop when needed.
        anyBoostActive = hasAnyLocalInstalled();
        var gk = Object.keys(globalBoostRanks);
        for(var gi = 0; gi < gk.length; gi++){
            if((globalBoostRanks[gk[gi]] || 0) > 0){ anyBoostActive = true; break; }
        }
        lastBoostTick = -1000;
    }catch(e){ Log.err("New Tech's refresh effects failed: " + e); }
}

function buildBulletCatalog(){
    if(CATEGORY_GROUPS["bullet"] == null) CATEGORY_GROUPS["bullet"] = [];
    // TEST MODE: only Duo, Spectre, Cyclone, Ripple, Scatter — remove others
    CATEGORY_GROUPS["bullet"] = [];
    // drop old bullet groups from GROUPS / BLOCK_GROUPS
    try{
        var keepGroups = [];
        for(var gi = 0; gi < GROUPS.length; gi++){
            var gg = GROUPS[gi];
            if(gg != null && gg.bulletGroup) continue;
            keepGroups.push(gg);
        }
        GROUPS = keepGroups;
    }catch(eG){}
    try{
        var bkeys = Object.keys(BLOCK_GROUPS);
        for(var bi = 0; bi < bkeys.length; bi++){
            var bk = bkeys[bi];
            if(bk.indexOf("bullet-turret-") === 0 || bk.indexOf("bullet-unit-") === 0){
                try{ delete BLOCK_GROUPS[bk]; }catch(eD){ BLOCK_GROUPS[bk] = null; }
            }
        }
    }catch(eB){}

    var names = ["duo"]; // test focus — only Duo
    for(var i = 0; i < names.length; i++){
        (function(nm){
            try{
                var b = null;
                try{ if(Blocks != null && Blocks[nm] != null) b = Blocks[nm]; }catch(e0){}
                if(b == null){
                    try{ b = Vars.content.block(nm); }catch(e1){}
                }
                if(b == null){
                    try{
                        Vars.content.blocks().each(function(x){
                            if(b == null && x != null && (""+x.name) === nm) b = x;
                        });
                    }catch(eF){}
                }
                if(b == null){ Log.warn("New Tech's: missing test turret " + nm); return; }
                addBulletGroupForTurret(b);
                try{ ensureTurretBulletVariants(b); }catch(eV){}
            }catch(e){ Log.err("New Tech's bullet " + nm + ": " + e); }
        })(names[i]);
    }
    Log.info("New Tech's: bullet test catalog = DUO only (per-ammo variants)");
}


function applyBulletTurretLevels(block){
    // Turret combat power is INSTALL-based (runtime). Here only optional color tint from research.
    if(block == null) return;
    try{
        var dmg = levelOf(bulletId("turret", block.name, "dmg"));
        var vel = levelOf(bulletId("turret", block.name, "vel"));
        var prc = levelOf(bulletId("turret", block.name, "pierce"));
        var spl = levelOf(bulletId("turret", block.name, "splash"));
        var rank = (dmg|0)+(vel|0)+(prc|0)+(spl|0);
        if(rank > 0) tintTurretBulletTypes(block, bulletUpgradeColor(rank, prc, spl));
    }catch(e){}
}

function applyBulletUnitLevels(unitType){
    if(unitType == null) return;
    var snap = ensureBulletSnapshotUnit(unitType);
    var dmg = levelOf(bulletId("unit", unitType.name, "dmg"));
    var rof = levelOf(bulletId("unit", unitType.name, "rof"));
    var vel = levelOf(bulletId("unit", unitType.name, "vel"));
    var prc = levelOf(bulletId("unit", unitType.name, "pierce"));
    var spl = levelOf(bulletId("unit", unitType.name, "splash"));
    try{
        for(var i = 0; i < unitType.weapons.size; i++){
            var w = unitType.weapons.get(i);
            var s = snap.weapons[i];
            if(w == null || s == null || w.bullet == null) continue;
            var reloadMul = (1 + 0.10 * dmg) / (1 + 0.12 * rof);
            if(reloadMul < 0.42) reloadMul = 0.42;
            if(reloadMul > 1.6) reloadMul = 1.6;
            try{ w.reload = s.reload * reloadMul; }catch(eR){}
            var dmgMul = 1 + 0.15 * dmg;
            var velMul = 1 + 0.10 * vel;
            applyCapturedToBulletType(w.bullet, s, dmgMul, velMul, 1, prc|0, 1 + 0.12 * spl);
        }
    }catch(e){}
}

function applyAllBulletUpgrades(){
    // Three systems:
    // 1) Constructions — handled by install/boost pipeline (not here)
    // 2) Turrets — research unlocks; INSTALL per building; runtime applies (colors + power)
    // 3) Units — research applies to unit type content
    if(isPvp()) return;
    // Duo-only test: snapshot ammo + apply rank variants per ammo type
    try{
        snapshotDuoAmmoOriginals();
        var rank = duoResearchRank();
        applyDuoAmmoRank(rank);
    }catch(eV){}
    try{ rebuildBulletSwapCache(); }catch(e3){}
}

/** SYSTEM 3 — Units: research levels mutate unit weapon bullets */
function applyUnitBulletSystem(){
    try{
        Vars.content.units().each(function(u){
            try{ if(unitHasGuns(u)) applyBulletUnitLevels(u); }catch(e){}
        });
    }catch(e2){}
}

/** SYSTEM 2 visual — Turret ammo colors follow research (not install) so you see the line is unlocked */
function applyTurretBulletColorsFromResearch(){
    try{
        Vars.content.blocks().each(function(b){
            try{
                if(!isAnyBulletTurret(b) || !isBulletTestTurret(b)) return;
                var dmg = levelOf(bulletId("turret", b.name, "dmg"));
                var vel = levelOf(bulletId("turret", b.name, "vel"));
                var prc = levelOf(bulletId("turret", b.name, "pierce"));
                var spl = levelOf(bulletId("turret", b.name, "splash"));
                var rank = (dmg|0) + (vel|0) + (prc|0) + (spl|0);
                if(rank <= 0) return;
                var col = bulletUpgradeColor(rank, prc, spl);
                tintTurretBulletTypes(b, col);
            }catch(e){}
        });
    }catch(e1){}
}

function bulletUpgradeColor(rank, pierce, splash){
    // Distinct hues by focus
    if((splash|0) >= (pierce|0) && (splash|0) >= 2) return Color.valueOf("ff8a65"); // orange splash
    if((pierce|0) >= 2) return Color.valueOf("b388ff"); // purple pierce
    if(rank >= 8) return Color.valueOf("ff5252"); // strong red
    if(rank >= 4) return Color.valueOf("ffd54f"); // gold
    return Color.valueOf("80d8ff"); // cyan basic upgrade
}

function tintBulletType(bt, col){
    if(bt == null || col == null) return;
    try{ bt.frontColor = col; }catch(e){}
    try{ bt.backColor = col; }catch(e2){}
    try{ bt.trailColor = col; }catch(e3){}
    try{ bt.hitColor = col; }catch(e4){}
    try{ bt.lightColor = col; }catch(e5){}
}

function tintTurretBulletTypes(block, col){
    try{
        if(block.ammoTypes != null){
            var entries = block.ammoTypes.entries();
            while(entries.hasNext()){
                var e = entries.next();
                if(e != null && e.value != null) tintBulletType(e.value, col);
            }
        }
    }catch(e){}
    try{ if(block.shootType != null) tintBulletType(block.shootType, col); }catch(e2){}
}

/** Installed levels on a turret building (SYSTEM 2 power) */
function turretInstalledBulletLevels(build){
    if(build == null || build.block == null) return null;
    var n = ""+build.block.name;
    var dmg = getApplied(build, bulletId("turret", n, "dmg"))|0;
    var rof = getApplied(build, bulletId("turret", n, "rof"))|0;
    var rng = getApplied(build, bulletId("turret", n, "range"))|0;
    var vel = getApplied(build, bulletId("turret", n, "vel"))|0;
    var prc = getApplied(build, bulletId("turret", n, "pierce"))|0;
    var spl = getApplied(build, bulletId("turret", n, "splash"))|0;
    if(dmg+rof+rng+vel+prc+spl <= 0) return null;
    return {dmg:dmg, rof:rof, rng:rng, vel:vel, pierce:prc, splash:spl};
}

function rebuildBulletSwapCache(){
    bulletSwapCache = {};
    if(isPvp()) return;
    // Turrets are NOT cached from research — they need install (runtime reads getApplied).
    try{
        Vars.content.units().each(function(u){
            try{
                if(!unitHasGuns(u)) return;
                var dmg = levelOf(bulletId("unit", u.name, "dmg"));
                var vel = levelOf(bulletId("unit", u.name, "vel"));
                var prc = levelOf(bulletId("unit", u.name, "pierce"));
                var spl = levelOf(bulletId("unit", u.name, "splash"));
                if((dmg|0)+(vel|0)+(prc|0)+(spl|0) <= 0) return;
                bulletSwapCache["u:"+u.name] = {
                    dmgMul: (1 + 0.15 * dmg),
                    velMul: (1 + 0.10 * vel),
                    pierce: prc|0,
                    splashMul: 1 + 0.12 * spl,
                    kind: "unit",
                    color: bulletUpgradeColor((dmg|0)+(vel|0)+(prc|0)+(spl|0), prc, spl)
                };
            }catch(e){}
        });
    }catch(e2){}
}

function ruleForBulletOwner(b){
    if(b == null || b.owner == null) return null;
    try{
        var o = b.owner;
        // SYSTEM 2 — Turret building: only INSTALLED levels count
        if(o.block != null){
            var inst = turretInstalledBulletLevels(o);
            if(inst == null) return null;
            return {
                dmgMul: 1 + 0.12 * inst.dmg,
                velMul: 1 + 0.07 * inst.vel,
                pierce: inst.pierce,
                splashMul: 1 + 0.15 * inst.splash,
                kind: "turret",
                color: bulletUpgradeColor(inst.dmg+inst.vel+inst.pierce+inst.splash, inst.pierce, inst.splash)
            };
        }
        // SYSTEM 3 — Unit: research cache
        if(o.type != null){
            return bulletSwapCache["u:"+o.type.name] || null;
        }
    }catch(e){}
    return null;
}

function spawnExtraBulletFrom(src, ang){
    if(src == null || src.type == null) return null;
    var type = src.type;
    var owner = src.owner;
    var team = src.team;
    var x = src.x, y = src.y;
    var nb = null;
    // Try every common Mindustry create overload
    try{ nb = type.create(owner, team, x, y, ang); }catch(e1){}
    if(nb == null){
        try{ nb = type.create(team, x, y, ang); }catch(e2){}
    }
    if(nb == null){
        try{ nb = type.create(owner, team, x, y, ang, -1, 1, 1, null); }catch(e3){}
    }
    if(nb == null){
        try{ nb = Bullet.create(type, team, x, y, ang); }catch(e4){}
    }
    if(nb == null){
        try{ nb = Bullet.create(type, owner, team, x, y, ang); }catch(e5){}
    }
    if(nb == null){
        try{
            // last resort: copy via type.create with damage scale
            nb = type.create(x, y, ang);
        }catch(e6){}
    }
    if(nb == null) return null;
    // Match velocity of original
    try{
        if(src.vel != null && nb.vel != null){
            var spd = src.vel.len();
            if(spd < 0.05 && src.type != null && src.type.speed > 0) spd = src.type.speed;
            nb.vel.trns(ang, spd);
        }
    }catch(eV){
        try{
            if(nb.vel != null && src.type != null) nb.vel.trns(ang, src.type.speed);
        }catch(eV2){}
    }
    // Damage same as source
    try{ if(src.damage != null) nb.damage = src.damage; }catch(eD){}
    try{ bulletSeenIds[""+(nb.id|0)] = true; }catch(eId){}
    return nb;
}

function processFreshBullet(b){
    if(b == null) return;
    var id = -1;
    try{ id = b.id|0; }catch(e){ return; }
    if(id < 0 || bulletSeenIds[""+id]) return;
    // Don't skip slightly older bullets — sweep may lag a few ticks
    try{ if(b.time > 3.0) { bulletSeenIds[""+id] = true; return; } }catch(eT){}
    bulletSeenIds[""+id] = true;

    // Duo: spawn EXTRA bullets (research OR install). Size already scaled by applyDuoAmmoRank.
    try{
        var o = b.owner;
        if(o == null) return;
        var bname = "";
        try{
            if(o.block != null) bname = ""+o.block.name;
            else if(o.type != null) bname = ""+o.type.name; // unit owner
        }catch(eN){}
        if(bname !== "duo") return;

        var tcfg = turretBulletCfg("duo");
        if(tcfg != null && tcfg.enabled === false) return;
        var ir = 0;
        try{ ir = duoBuildingInstallRank(o)|0; }catch(eI){}
        var rr = 0;
        try{ rr = duoResearchRank()|0; }catch(eR){}
        var rank = Math.max(ir, rr);
        if(rank <= 0) return;

        var perRank = 1, maxExtras = 3, spreadDeg = 4.0;
        try{
            if(tcfg != null && tcfg.extraBullets != null){
                var eb = tcfg.extraBullets;
                if(eb.perRank != null) perRank = eb.perRank|0;
                if(eb.maxExtras != null) maxExtras = eb.maxExtras|0;
                if(eb.spreadDegrees != null) spreadDeg = eb.spreadDegrees;
            }
        }catch(eCfg){}
        var extraN = Math.min(maxExtras, Math.max(1, rank * Math.max(1, perRank)));
        var baseAng = 0;
        try{ baseAng = b.rotation(); }catch(eA){
            try{ baseAng = b.vel != null ? b.vel.angle() : 0; }catch(eA2){ baseAng = 0; }
        }
        for(var k = 0; k < extraN; k++){
            try{
                var spread = (k - (extraN - 1) / 2) * spreadDeg;
                var ang = baseAng + spread;
                if(Math.abs(spread) < 0.01 && extraN > 1) ang = baseAng + (spreadDeg * 0.6);
                spawnExtraBulletFrom(b, ang);
            }catch(eOne){}
        }
    }catch(e){}
}

function sweepBulletsRuntime(){
    if(Vars.headless && !Vars.net.server()) return;
    if(isPvp()) return;
    // Skip unless Duo research exists (install alone still needs research ranks on bullet cards)
    var ok = false;
    try{ if(duoResearchRank() > 0) ok = true; }catch(eR){}
    if(!ok) return;
    try{
        Groups.bullets.each(function(b){
            try{ processFreshBullet(b); }catch(e1){}
        });
    }catch(e){}
    try{
        var n = 0;
        for(var id in bulletSeenIds) n++;
        if(n > 2500) bulletSeenIds = {};
    }catch(e2){}
}

function restoreProgressEffects(){
    try{
        // Reload saved research, re-apply masters, refresh global ranks and boost cache
        activeStoreKey = null;
        activeTagKey = null;
        loadPersistentState();
        masterActivationKey = null;
        ensureCatalogBuilt();
        refreshGlobalBoostRanks();
        try{ activateResearchedMasters(); }catch(e1){}
        masterActivationKey = stateStoreKey();
        anyBoostActive = true;
        lastScanTick = -1000;
        lastBoostTick = -1000;
        try{ rescanBoostTargets(); }catch(e2){}
        try{ applyAllBulletUpgrades(); }catch(eB){}
        try{ readHostTags(); }catch(eT){}
        var n = 0;
        try{ n = Object.keys(persistentLevels).length; }catch(e3){}
        Vars.ui.showInfo(tr("Restored " + n + " research entries. Effects re-applied.", "Restaurados " + n + " progressos. Efeitos reaplicados."));
        Log.info("New Tech's: restoreProgressEffects done, levels=" + n);
    }catch(err){
        Log.err("New Tech's restore: " + err);
        Vars.ui.showInfo(tr("Restore failed. Check logs.", "Falha ao restaurar. Veja os logs."));
    }
}

function resetAllProgress(){
    try{
        ensurePersistentState();
        persistentLevels = {};
        persistentPartial = {};
        appliedMap = {};
        cachedBoostTargets = [];
        cachedBoostTargetKeys = {};
        masterActivationKey = null;
        masterAppliedTeamId = -1;
        // Restore master base stats then clear effects by reactivating empty set
        try{
            var keys = Object.keys(BLOCK_GROUPS);
            for(var r = 0; r < keys.length; r++){
                var oldGroup = BLOCK_GROUPS[keys[r]];
                if(oldGroup != null && oldGroup.block != null){
                    try{ restoreMasterBase(oldGroup.block()); }catch(eR){}
                }
            }
        }catch(eB){}
        savePersistentState(true);
        refreshGlobalBoostRanks();
        anyBoostActive = false;
        lastScanTick = -1000;
        Vars.ui.showInfo(tr("All New Tech's progress was reset.", "Todo o progresso do New Tech's foi resetado."));
        Log.info("New Tech's: progress reset");
    }catch(err){
        Log.err("New Tech's reset: " + err);
        Vars.ui.showInfo(tr("Reset failed. Check logs.", "Falha ao resetar. Veja os logs."));
    }
}


// ========== Map Contracts (timed master-style missions) ==========
function contractsMapKey(){
    try{ return safePart(mapIdentity() + "-" + currentGameModeKey()); }catch(e){ return "default"; }
}
function nowMs(){
    // Always a JS number — Java Long from Time.millis() breaks comparisons in Rhino
    try{
        var t = Time.millis();
        var n = Number(t);
        if(isFinite(n) && n > 0) return n;
    }catch(e){}
    try{ return Date.now(); }catch(e2){}
    return 0;
}
function contractDurationSecs(c){
    var s = 0;
    try{ s = Number(c.secs); }catch(e){ s = 0; }
    if(!isFinite(s) || s < 60) s = 600;
    return s|0;
}
function formatContractTime(leftSec){
    leftSec = Math.max(0, leftSec|0);
    var mm = (leftSec / 60)|0;
    var ss = leftSec % 60;
    return mm + ":" + (ss < 10 ? "0" : "") + ss;
}
function loadContracts(){
    try{
        var k = CONTRACT_KEY + "-" + contractsMapKey();
        var s = Core.settings.getString(k, "");
        if(s && s.length > 2){
            activeContracts = JSON.parse(s);
            return;
        }
    }catch(e){}
    activeContracts = null;
}
function saveContracts(){
    try{
        var k = CONTRACT_KEY + "-" + contractsMapKey();
        Core.settings.put(k, JSON.stringify(activeContracts));
    }catch(e){}
}
function rollMapContracts(){
    var mode = currentGameModeKey();
    var list = [];
    var templates = [
        {type:"core_items", target:2000, secs:600, rarity:"rare", en:"Deposit 2000 items in 10 min", pt:"Deposite 2000 itens em 10 min"},
        {type:"core_items", target:5000, secs:900, rarity:"epic", en:"Deposit 5000 items in 15 min", pt:"Deposite 5000 itens em 15 min"},
        {type:"build_any", target:50, secs:480, rarity:"uncommon", en:"Build 50 blocks in 8 min", pt:"Construa 50 blocos em 8 min"},
        {type:"build_any", target:120, secs:720, rarity:"rare", en:"Build 120 blocks in 12 min", pt:"Construa 120 blocos em 12 min"},
        {type:"units_built", target:8, secs:600, rarity:"rare", en:"Produce 8 units in 10 min", pt:"Produza 8 unidades em 10 min"}
    ];
    if(mode === "pvp" || mode === "attack"){
        templates.push({type:"destroy_enemy", target:25, secs:600, rarity:"epic", en:"Destroy 25 enemy buildings in 10 min", pt:"Destrua 25 predios inimigos em 10 min"});
    }
    if(mode === "survival" || mode === "campaign"){
        templates.push({type:"wave", target:5, secs:900, rarity:"rare", en:"Survive 5 waves within 15 min", pt:"Sobreviva a 5 waves em 15 min"});
    }
    var used = {};
    var tries = 0;
    while(list.length < 3 && tries < 40){
        tries++;
        var t = templates[(Math.random()*templates.length)|0];
        var key = t.type + "-" + t.target;
        if(used[key]) continue;
        used[key] = true;
        var reward = rarityPointsReward(t.rarity);
        reward = Math.min(500, reward + 50);
        list.push({
            id: "ct-" + nowMs() + "-" + list.length,
            type: t.type,
            target: t.target,
            progress: 0,
            secs: t.secs,
            deadline: 0,
            rarity: t.rarity,
            reward: reward,
            en: t.en,
            pt: t.pt,
            claimed: false,
            failed: false,
            accepted: false,
            acceptedAt: 0
        });
    }
    activeContracts = { list: list, mapKey: contractsMapKey(), rolledAt: nowMs() };
    saveContracts();
}
function ensureContracts(){
    loadContracts();
    if(activeContracts == null || activeContracts.list == null || activeContracts.mapKey !== contractsMapKey()){
        rollMapContracts();
    }
    try{
        var now = nowMs();
        var list = activeContracts.list;
        var changed = false;
        for(var i = 0; i < list.length; i++){
            var c = list[i];
            if(c == null) continue;
            // Strict accept: MUST be boolean true AND have acceptedAt timestamp
            var reallyAccepted = (c.accepted === true && (c.acceptedAt|0) > 0);
            if(!reallyAccepted){
                if(c.accepted || (c.deadline|0) > 0 || (c.progress|0) > 0 || (c.acceptedAt|0) > 0){
                    changed = true;
                }
                c.accepted = false;
                c.acceptedAt = 0;
                c.deadline = 0;
                c.progress = 0;
                if(!c.claimed) c.failed = false;
                continue;
            }
            if(c.claimed || c.failed) continue;
            var dl = Number(c.deadline);
            if(!isFinite(dl) || dl <= 0){
                c.accepted = false;
                c.acceptedAt = 0;
                c.deadline = 0;
                c.progress = 0;
                changed = true;
                continue;
            }
            if(now > dl && (c.progress|0) < (c.target|0)){
                c.failed = true;
                changed = true;
            }
        }
        if(changed) saveContracts();
    }catch(e){}
}
function bumpContract(type, amount){
    try{
        ensureContracts();
        if(activeContracts == null || activeContracts.list == null) return;
        amount = amount || 1;
        var now = nowMs();
        var changed = false;
        for(var i = 0; i < activeContracts.list.length; i++){
            var c = activeContracts.list[i];
            if(c == null || c.claimed || c.failed || c.accepted !== true || !(c.acceptedAt > 0)) continue;
            if(c.type !== type) continue;
            var dl = Number(c.deadline);
            if(isFinite(dl) && dl > 0 && now > dl){
                c.failed = true;
                changed = true;
                continue;
            }
            c.progress = (c.progress|0) + amount;
            if(c.progress > c.target) c.progress = c.target;
            changed = true;
        }
        if(changed) saveContracts();
    }catch(e){}
}

function acceptContract(id){
    // Only called from the Accept button — never auto
    loadContracts();
    if(activeContracts == null || activeContracts.list == null) return false;
    if(activeContracts.mapKey !== contractsMapKey()) return false;
    for(var i = 0; i < activeContracts.list.length; i++){
        var c = activeContracts.list[i];
        if(c == null || c.id !== id) continue;
        if(c.claimed) return false;
        if(c.accepted === true && !c.failed) return false;
        var dur = contractDurationSecs(c);
        c.secs = dur;
        c.accepted = true;
        c.failed = false;
        c.claimed = false;
        c.progress = 0;
        c.deadline = nowMs() + dur * 1000;
        c.acceptedAt = nowMs();
        saveContracts();
        return true;
    }
    return false;
}
function claimContract(id){
    ensureContracts();
    if(activeContracts == null) return false;
    for(var i = 0; i < activeContracts.list.length; i++){
        var c = activeContracts.list[i];
        if(c == null || c.id !== id) continue;
        if(c.claimed || !c.accepted) return false;
        var now = nowMs();
        var dl = Number(c.deadline);
        if(isFinite(dl) && dl > 0 && now > dl && (c.progress|0) < (c.target|0)){
            c.failed = true;
            saveContracts();
            return false;
        }
        if(c.failed) return false;
        if((c.progress|0) < (c.target|0)) return false;
        c.claimed = true;
        addPoints(c.reward|0);
        try{
            var item = null;
            try{ item = Vars.content.item("surge-alloy"); }catch(e1){}
            if(item == null) try{ item = Vars.content.item("thorium"); }catch(e2){}
            if(item == null) try{ item = Vars.content.item("titanium"); }catch(e3){}
            if(item != null) giveItemsToPlayerTeam(item, c.rarity === "epic" ? 20 : 10);
        }catch(eI){}
        saveContracts();
        return true;
    }
    return false;
}
function showContractsDialog(){
    ensureContracts();
    var dialog = new BaseDialog(tr("Map Contracts", "Contratos do Mapa"));
    var body = new Table();
    body.defaults().growX().pad(4);
    body.table(Tex.pane, function(tip){
        tip.left().defaults().left().pad(4);
        tip.add("[accent]" + tr("Contracts tutorial", "Tutorial de contratos")).row();
        tip.add("[white]" + tr("Contracts are optional timed challenges for this map.", "Contratos sao desafios com tempo neste mapa.")).wrap().row();
        tip.add("[white]" + tr("Press Accept to start the timer. Nothing starts by itself.", "Aperte Aceitar para comecar o tempo. Nada inicia sozinho.")).wrap().row();
        tip.add("[white]" + tr("Finish the goal before time runs out, then claim the points.", "Cumpra a meta antes do tempo acabar e colete os pontos.")).wrap().row();
        tip.add("[gray]" + tr("Failed contracts cannot be claimed. You can reroll the list for points.", "Contratos falhos nao dao recompensa. Dá para trocar a lista gastando pontos.")).wrap().row();
    }).growX().padBottom(8).row();

    var list = (activeContracts && activeContracts.list) ? activeContracts.list : [];
    var now = nowMs();

    for(var i = 0; i < list.length; i++){
        (function(c){
            body.table(Tex.button, function(tbl){
                try{ if(fxEnabled()) ntFadeIn(tbl, 0.05 * i); }catch(eA){}
                tbl.left().defaults().left().pad(5);
                var title = tr(c.en, c.pt);
                var dl = Number(c.deadline);
                var isAcc = (c.accepted === true && (c.acceptedAt|0) > 0);
                var leftSec = 0;
                if(isAcc && isFinite(dl) && dl > 0){
                    leftSec = Math.max(0, Math.floor((dl - now) / 1000));
                }else{
                    leftSec = contractDurationSecs(c);
                }
                if(isAcc && !c.claimed && !c.failed && isFinite(dl) && dl > 0 && now > dl && (c.progress|0) < (c.target|0)){
                    c.failed = true;
                    try{ saveContracts(); }catch(eF){}
                }
                var status;
                if(c.claimed) status = "[lime]" + tr("CLAIMED", "COLETADO");
                else if(c.failed && isAcc) status = "[scarlet]" + tr("FAILED", "FALHOU");
                else if(!isAcc) status = "[gray]" + tr("AVAILABLE — not started", "DISPONIVEL — nao iniciado");
                else if((c.progress|0) >= (c.target|0)) status = "[lime]" + tr("READY TO CLAIM", "PRONTO PARA COLETAR");
                else status = "[accent]" + tr("ACTIVE", "ATIVO");

                tbl.add(status).row();
                tbl.add("[white]" + title).wrap().growX().row();
                tbl.table(Styles.none, function(row){
                    row.add("[#ffd54f]" + (c.reward|0) + " pts").padRight(10);
                    row.add("[lightgray]" + ((c.secs/60)|0) + " min");
                }).row();

                if(!isAcc && !c.claimed){
                    tbl.add("[gray]" + tr("Timer starts only when you press Accept.", "O tempo so comeca quando voce apertar Aceitar.")).wrap().padTop(2).row();
                    tbl.button(tr("Accept contract", "Aceitar contrato"), function(){
                        var cid = c.id;
                        if(acceptContract(cid)){
                            quietInfo(tr("Contract accepted! Timer started.", "Contrato aceito! Tempo comecou."));
                        }
                        dialog.hide();
                        showContractsDialog();
                    }).size(180, 42).padTop(4);
                }else if(isAcc && !c.claimed && !c.failed){
                    tbl.add("[accent]" + tr("Time left: ", "Tempo restante: ") + formatContractTime(leftSec)).padTop(2).row();
                    var frac = c.target > 0 ? Math.min(1, (c.progress|0)/(c.target|0)) : 0;
                    tbl.add(progressBarText(frac, frac >= 1) + " " + (c.progress|0) + "/" + (c.target|0)).row();
                    if((c.progress|0) >= (c.target|0)){
                        tbl.button(tr("Claim reward", "Coletar recompensa"), function(){
                            if(claimContract(c.id)) quietInfo(tr("Contract claimed!", "Contrato coletado!"));
                            dialog.hide();
                            showContractsDialog();
                        }).size(180, 42).padTop(4);
                    }
                }else if(c.failed && isAcc){
                    tbl.add("[scarlet]" + tr("Time ran out.", "O tempo acabou.")).row();
                }else if(c.claimed){
                    tbl.add("[lime]" + tr("Reward already claimed.", "Recompensa ja coletada.")).row();
                }
            }).growX().pad(3).row();
        })(list[i]);
    }

    body.button(tr("Reroll contracts (400 pts)", "Trocar contratos (400 pts)"), function(){
        if(!spendPoints(400)){
            quietInfo(tr("Not enough points.", "Pontos insuficientes."));
            return;
        }
        rollMapContracts();
        dialog.hide();
        showContractsDialog();
    }).size(280, 42).padTop(8).row();

    dialog.addCloseButton();
    dialog.cont.pane(body).grow().pad(8);
    dialog.show();
}

// ========== Specialization tree (one path) ==========
function loadSpecialization(){
    try{ specializationPath = Core.settings.getString(SPEC_KEY, ""); if(specializationPath === "") specializationPath = null; }catch(e){ specializationPath = null; }
}
function saveSpecialization(){
    try{ Core.settings.put(SPEC_KEY, specializationPath == null ? "" : specializationPath); }catch(e){}
}
function specMultiplierForCategory(cat){
    try{
        loadSpecialization();
        if(specializationPath == null || specializationPath === "") return 1;
        if(cat === specializationPath) return 1.12; // +12% on chosen path
        // light penalty on other research categories (not bullet/special)
        if(cat === "bullet" || cat === "logic") return 1;
        return 0.96; // -4%
    }catch(e){ return 1; }
}
function showSpecializationDialog(){
    loadSpecialization();
    var dialog = new BaseDialog(tr("Specialization", "Especializacao"));
    var body = new Table();
    body.defaults().growX().pad(4);
    body.add("[accent]" + tr("Pick ONE path. Stronger bonuses there, slight penalty elsewhere.", "Escolha UM caminho. Bonus nele, leve penalidade nos outros.")).wrap().row();
    body.add("[gray]" + tr("Current: ", "Atual: ") + (specializationPath == null ? tr("None", "Nenhum") : catLabel(specializationPath))).padBottom(6).row();
    var paths = ["production", "crafting", "turret", "defense", "power", "unit"];
    for(var i = 0; i < paths.length; i++){
        (function(cat){
            var selected = specializationPath === cat;
            body.button((selected ? "[lime]✓ " : "") + catLabel(cat) + "  [gray]+12%", function(){
                specializationPath = cat;
                saveSpecialization();
                Vars.ui.showInfo(tr("Specialization: ", "Especializacao: ") + catLabel(cat));
                dialog.hide();
                showSpecializationDialog();
            }).growX().height(44).pad(3).row();
        })(paths[i]);
    }
    body.button(tr("Clear specialization", "Limpar especializacao"), function(){
        specializationPath = null;
        saveSpecialization();
        dialog.hide();
        showSpecializationDialog();
    }).size(240, 40).padTop(8).row();
    dialog.addCloseButton();
    dialog.cont.pane(body).grow().pad(8);
    dialog.show();
}

// ========== Ally gift (points → items to teammate core) ==========
function showAllyGiftDialog(){
    var dialog = new BaseDialog(tr("Send to Ally", "Enviar ao Aliado"));
    var body = new Table();
    body.defaults().growX().pad(4);
    body.add("[accent]" + tr("Spend points to send resources to a teammate's core.", "Gaste pontos para mandar recursos ao nucleo de um aliado.")).wrap().row();
    body.add("[#ffd54f]" + tr("Your points: ", "Seus pontos: ") + (persistentPoints|0)).padBottom(6).row();

    var allies = [];
    try{
        var myTeam = Vars.player != null ? Vars.player.team() : null;
        Groups.player.each(function(p){
            if(p == null || p === Vars.player) return;
            if(myTeam != null && p.team() === myTeam) allies.push(p);
        });
    }catch(e){}

    if(allies.length === 0){
        body.add("[gray]" + tr("No teammates online. (Works in multiplayer co-op.)", "Nenhum aliado online. (Funciona em co-op multiplayer.)")).wrap().row();
    }

    var giftItems = [];
    try{
        var names = ["copper", "lead", "silicon", "titanium", "thorium", "plastanium", "phase-fabric", "surge-alloy"];
        for(var gi = 0; gi < names.length; gi++){
            var it = Vars.content.item(names[gi]);
            if(it != null) giftItems.push(it);
        }
    }catch(e2){}

    function giftCost(item, amount){
        var base = 2;
        try{
            var n = (""+item.name).toLowerCase();
            if(n.indexOf("surge") >= 0 || n.indexOf("phase") >= 0) base = 8;
            else if(n.indexOf("thorium") >= 0 || n.indexOf("plastanium") >= 0) base = 5;
            else if(n.indexOf("titanium") >= 0 || n.indexOf("silicon") >= 0) base = 3;
        }catch(e){}
        return Math.max(20, amount * base);
    }

    for(var a = 0; a < allies.length; a++){
        (function(player){
            body.add("[white]" + (player.name() != null ? player.name() : "Player")).padTop(6).row();
            body.table(Styles.none, function(row){
                for(var ii = 0; ii < Math.min(4, giftItems.length); ii++){
                    (function(item){
                        var amount = 50;
                        var cost = giftCost(item, amount);
                        row.button(item.localizedName + "\n" + amount + "\n" + cost + "pts", function(){
                            if(!spendPoints(cost)){
                                quietInfo(tr("Not enough points.", "Pontos insuficientes."));
                                return;
                            }
                            var ok = false;
                            try{
                                if(shopUsesHostRelay()){
                                    Call.serverPacketReliable("newtechs-shop", JSON.stringify({
                                        op: "gift",
                                        targetId: player.id,
                                        item: ""+item.name,
                                        amount: amount,
                                        cost: cost
                                    }));
                                    ok = true;
                                }else{
                                    ok = giveItemsToTeam(player.team(), item, amount, player);
                                }
                            }catch(eG){}
                            if(ok){
                                quietInfo(tr("Gift sent!", "Presente enviado!"));
                            }else{
                                addPoints(cost);
                                quietInfo(tr("Gift failed.", "Falha ao enviar."));
                            }
                        }).size(90, 70).pad(2);
                    })(giftItems[ii]);
                }
            }).row();
        })(allies[a]);
    }

    dialog.addCloseButton();
    dialog.cont.pane(body).grow().pad(8);
    dialog.show();
}



// ========== UI prefs, daily challenge, streak, blueprint, gacha ==========
var UI_COMPACT_KEY = "newtechs-ui-compact";
var FX_KEY = "newtechs-fx-enabled";
var FUNNY_KEY = "newtechs-funny-desc";
var fxEnabledPref = true;
var funnyDescPref = false;

var UI_FILTER_KEY = "newtechs-ui-filter";
var uiCompactMode = false;
var uiBlockFilter = "all";
var STREAK_KEY = "newtechs-mission-streak";
var missionStreak = 0;
var DAILY_CHAL_KEY = "newtechs-daily-chal";
var dailyChallenge = null;
var blueprintData = null; // quick clipboard { blockName, levels }
var BLUEPRINTS_KEY = "newtechs-blueprints-personal";
var personalBlueprints = []; // {id, name, blockName, levels, created}
var pointsHudTable = null;

function loadUiPrefs(){
    try{ uiCompactMode = safeGetBool(UI_COMPACT_KEY, false); }catch(e){ uiCompactMode = false; }
    try{ uiBlockFilter = Core.settings.getString(UI_FILTER_KEY, "all"); if(!uiBlockFilter) uiBlockFilter = "all"; }catch(e2){ uiBlockFilter = "all"; }
    try{ missionStreak = Core.settings.getInt(STREAK_KEY, 0)|0; }catch(e3){ missionStreak = 0; }
    try{ fxEnabledPref = safeGetBool(FX_KEY, true); }catch(e4){ fxEnabledPref = true; }
    try{ funnyDescPref = safeGetBool(FUNNY_KEY, false); }catch(e5){ funnyDescPref = false; }
}
function saveUiPrefs(){
    try{ Core.settings.put(UI_COMPACT_KEY, !!uiCompactMode); }catch(e){}
    try{ Core.settings.put(UI_FILTER_KEY, uiBlockFilter || "all"); }catch(e2){}
    try{ Core.settings.put(STREAK_KEY, missionStreak|0); }catch(e3){}
    try{ Core.settings.put(FX_KEY, fxEnabledPref !== false); }catch(e4){}
    try{ Core.settings.put(FUNNY_KEY, !!funnyDescPref); }catch(e5){}
}
function fxEnabled(){
    try{ loadUiPrefs(); return fxEnabledPref !== false; }catch(e){ return true; }
}
function funnyDescEnabled(){
    try{ loadUiPrefs(); return funnyDescPref === true; }catch(e){ return false; }
}

function crumb(parts){
    try{
        var s = "";
        for(var i = 0; i < parts.length; i++){
            if(i > 0) s += " [gray]›[] ";
            s += parts[i];
        }
        return s;
    }catch(e){ return ""; }
}
function flashCardOk(){
    try{ quietInfo(tr("OK", "OK")); }catch(e){}
}

function loadStreak(){
    try{ missionStreak = Core.settings.getInt(STREAK_KEY, 0)|0; }catch(e){ missionStreak = 0; }
}
function saveStreak(){
    try{ Core.settings.put(STREAK_KEY, missionStreak|0); }catch(e){}
}
function onMissionClaimedStreak(){
    loadStreak();
    missionStreak = (missionStreak|0) + 1;
    var bonus = 0;
    if(missionStreak > 0 && missionStreak % 3 === 0){
        bonus = 80 + Math.min(120, (missionStreak / 3|0) * 25);
        addPoints(bonus);
        quietInfo(tr("Streak x" + missionStreak + "! +" + bonus + " pts", "Sequencia x" + missionStreak + "! +" + bonus + " pts"));
    }else{
        quietInfo(tr("Streak: " + missionStreak + "/3", "Sequencia: " + missionStreak + "/3"));
    }
    saveStreak();
}

function dailyChalDayKey(){
    try{ return (new Date()).toISOString().substring(0, 10); }catch(e){ return "day"; }
}
function ensureDailyChallenge(){
    try{
        var day = dailyChalDayKey();
        var raw = Core.settings.getString(DAILY_CHAL_KEY, "");
        if(raw && raw.length > 2){
            var data = JSON.parse(raw);
            if(data != null && data.day === day){
                dailyChallenge = data;
                return;
            }
        }
        // New daily — shared theme for all players (same day key)
        var pool = [
            {type:"build_any", target:40, reward:120, en:"Daily: build 40 blocks", pt:"Diaria: construa 40 blocos"},
            {type:"core_items", target:800, reward:140, en:"Daily: deposit 800 items", pt:"Diaria: deposite 800 itens"},
            {type:"units_built", target:6, reward:130, en:"Daily: produce 6 units", pt:"Diaria: produza 6 unidades"},
            {type:"destroy_enemy", target:15, reward:150, en:"Daily: destroy 15 enemy buildings", pt:"Diaria: destrua 15 predios inimigos"}
        ];
        // Deterministic pick from day string
        var h = 0;
        for(var i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i))|0;
        var tmpl = pool[Math.abs(h) % pool.length];
        dailyChallenge = {
            day: day,
            type: tmpl.type,
            target: tmpl.target,
            progress: 0,
            reward: tmpl.reward,
            en: tmpl.en,
            pt: tmpl.pt,
            claimed: false
        };
        Core.settings.put(DAILY_CHAL_KEY, JSON.stringify(dailyChallenge));
    }catch(e){ dailyChallenge = null; }
}
function saveDailyChallenge(){
    try{ if(dailyChallenge != null) Core.settings.put(DAILY_CHAL_KEY, JSON.stringify(dailyChallenge)); }catch(e){}
}
function bumpDailyChallenge(type, amount){
    try{
        ensureDailyChallenge();
        if(dailyChallenge == null || dailyChallenge.claimed) return;
        if(dailyChallenge.type !== type) return;
        dailyChallenge.progress = (dailyChallenge.progress|0) + (amount||1);
        if(dailyChallenge.progress > dailyChallenge.target) dailyChallenge.progress = dailyChallenge.target;
        saveDailyChallenge();
    }catch(e){}
}
function claimDailyChallenge(){
    ensureDailyChallenge();
    if(dailyChallenge == null || dailyChallenge.claimed) return false;
    if((dailyChallenge.progress|0) < (dailyChallenge.target|0)) return false;
    dailyChallenge.claimed = true;
    addPoints(dailyChallenge.reward|0);
    saveDailyChallenge();
    quietInfo(tr("Daily claimed! +" + (dailyChallenge.reward|0) + " pts", "Diaria coletada! +" + (dailyChallenge.reward|0) + " pts"));
    return true;
}
function showDailyChallengeDialog(){
    ensureDailyChallenge();
    loadStreak();
    var dialog = new BaseDialog(tr("Daily Challenge", "Desafio Diario"));
    var body = new Table();
    body.defaults().growX().pad(4);
    body.add("[accent]" + tr("Same challenge for everyone today.", "Mesmo desafio para todos hoje.")).wrap().row();
    body.add("[gray]" + tr("Mission streak: ", "Sequencia de missoes: ") + (missionStreak|0) + "  (" + tr("bonus every 3", "bonus a cada 3") + ")").row();
    if(dailyChallenge != null){
        var frac = dailyChallenge.target > 0 ? Math.min(1, (dailyChallenge.progress|0)/(dailyChallenge.target|0)) : 0;
        body.table(Tex.button, function(tbl){
            tbl.left().defaults().left().pad(4);
            tbl.add("[white]" + tr(dailyChallenge.en, dailyChallenge.pt)).wrap().growX().row();
            tbl.add(progressBarText(frac, frac >= 1) + " " + (dailyChallenge.progress|0) + "/" + (dailyChallenge.target|0)).row();
            tbl.add("[#ffd54f]" + (dailyChallenge.reward|0) + " pts").row();
            if(dailyChallenge.claimed){
                tbl.add("[lime]" + tr("Claimed today", "Coletado hoje")).row();
            }else if((dailyChallenge.progress|0) >= (dailyChallenge.target|0)){
                tbl.button(tr("Claim", "Coletar"), function(){
                    claimDailyChallenge();
                    dialog.hide(); showDailyChallengeDialog();
                }).size(140, 42);
            }else{
                tbl.add("[lightgray]" + tr("In progress...", "Em progresso...")).row();
            }
        }).growX().row();
    }
    dialog.addCloseButton();
    dialog.cont.pane(body).grow().pad(8);
    dialog.show();
}

// Blueprint copy/paste installs
function blueprintOwnerKey(){
    // Personal only — never shared across players
    try{
        if(Vars.player != null){
            try{ if(Vars.player.uuid != null) return "u-" + Vars.player.uuid(); }catch(e0){}
            try{ return "n-" + stripNameColors(Vars.player.name); }catch(e1){}
        }
    }catch(e){}
    try{ return "s-" + Core.settings.getString("name", "local"); }catch(e2){}
    return "local";
}
function blueprintsStoreKey(){
    return BLUEPRINTS_KEY + "-" + safePart(blueprintOwnerKey());
}
function loadPersonalBlueprints(){
    try{
        var raw = Core.settings.getString(blueprintsStoreKey(), "[]");
        var arr = JSON.parse(raw);
        personalBlueprints = (arr != null && arr.length != null) ? arr : [];
    }catch(e){ personalBlueprints = []; }
}
function savePersonalBlueprints(){
    try{ Core.settings.put(blueprintsStoreKey(), JSON.stringify(personalBlueprints || [])); }catch(e){}
}
function extractBlueprintLevels(build){
    var levels = {};
    var any = false;
    var ups = upgradesForBlock(build.block);
    for(var i = 0; i < ups.length; i++){
        var u = ups[i];
        if(u == null) continue;
        var lv = getApplied(build, u.id)|0;
        if(lv > 0){ levels[u.id] = lv; any = true; }
    }
    return any ? levels : null;
}
function countBpLevels(levels){
    try{ return Object.keys(levels || {}).length; }catch(e){ return 0; }
}
function copyBlueprintFromBuild(build){
    try{
        if(build == null || build.block == null) return false;
        var levels = extractBlueprintLevels(build);
        if(levels == null){
            quietInfo(tr("No installs to copy.", "Nada instalado para copiar."));
            return false;
        }
        blueprintData = { blockName: ""+build.block.name, levels: levels };
        quietInfo(tr("Blueprint copied (clipboard).", "Blueprint copiado (area de transferencia)."));
        return true;
    }catch(e){ return false; }
}
function applyBlueprintLevels(build, blockName, levels, costPts){
    if(build == null || build.block == null || levels == null) return false;
    if((""+build.block.name) !== blockName){
        quietInfo(tr("Same block type only.", "So o mesmo tipo de bloco."));
        return false;
    }
    costPts = costPts|0;
    if(costPts > 0 && !spendPoints(costPts)){
        quietInfo(tr("Need points to apply.", "Precisa pontos para aplicar."));
        return false;
    }
    var ids = Object.keys(levels);
    for(var i = 0; i < ids.length; i++){
        var id = ids[i];
        var want = levels[id]|0;
        var researched = levelOf(id)|0;
        var cur = getApplied(build, id)|0;
        var target = Math.min(want, researched);
        if(target > cur){
            try{ setApplied(build, id, target); }catch(eS){}
        }
    }
    try{ rescanBoostTargets(); }catch(eR){}
    try{ flashInstallEffect(build); }catch(eF){}
    return true;
}
function pasteBlueprintToBuild(build){
    try{
        if(blueprintData == null){
            quietInfo(tr("No clipboard blueprint. Open library or copy first.", "Sem blueprint. Abra a biblioteca ou copie."));
            return false;
        }
        if(applyBlueprintLevels(build, blueprintData.blockName, blueprintData.levels, 80)){
            quietInfo(tr("Blueprint applied (-80 pts).", "Blueprint aplicado (-80 pts)."));
            return true;
        }
        return false;
    }catch(e){ return false; }
}
function saveClipboardAsNamedBlueprint(name){
    loadPersonalBlueprints();
    if(blueprintData == null){
        quietInfo(tr("Copy a building first.", "Copie um predio primeiro."));
        return false;
    }
    if(personalBlueprints.length >= 20){
        quietInfo(tr("Max 20 blueprints.", "Maximo 20 blueprints."));
        return false;
    }
    name = (name == null || (""+name).length < 1) ? (blueprintData.blockName + " BP") : (""+name);
    personalBlueprints.push({
        id: "bp-" + nowMs() + "-" + ((Math.random()*9999)|0),
        name: name,
        blockName: blueprintData.blockName,
        levels: blueprintData.levels,
        created: nowMs()
    });
    savePersonalBlueprints();
    quietInfo(tr("Blueprint saved.", "Blueprint salvo."));
    return true;
}
function deletePersonalBlueprint(id){
    loadPersonalBlueprints();
    var next = [];
    for(var i = 0; i < personalBlueprints.length; i++){
        if(personalBlueprints[i] != null && personalBlueprints[i].id !== id) next.push(personalBlueprints[i]);
    }
    personalBlueprints = next;
    savePersonalBlueprints();
}
function renamePersonalBlueprint(id, newName){
    loadPersonalBlueprints();
    for(var i = 0; i < personalBlueprints.length; i++){
        if(personalBlueprints[i] != null && personalBlueprints[i].id === id){
            personalBlueprints[i].name = newName;
            savePersonalBlueprints();
            return true;
        }
    }
    return false;
}
function describeBlueprintLevels(levels){
    var lines = [];
    try{
        var ids = Object.keys(levels || {});
        for(var i = 0; i < ids.length; i++){
            var id = ids[i];
            var lv = levels[id]|0;
            var u = UPGRADES[id];
            if(u == null) u = MASTER_UPGRADES[id];
            var nm = u != null ? upgradeDisplayName(u) : id;
            lines.push(nm + "  →  " + tr("Level ", "Nivel ") + lv);
        }
    }catch(e){}
    return lines;
}
function showBlueprintDetailDialog(bp, build){
    if(bp == null) return;
    var dialog = new BaseDialog(bp.name || tr("Blueprint", "Blueprint"));
    var body = new Table();
    body.defaults().growX().pad(4);
    var bname = bp.blockName;
    try{ var bb = Vars.content.block(bp.blockName); if(bb) bname = bb.localizedName; }catch(e){}
    body.add("[accent]" + bname).row();
    body.add("[gray]" + tr("Upgrades saved in this blueprint:", "Melhorias salvas neste blueprint:")).padTop(4).padBottom(4).row();
    var lines = describeBlueprintLevels(bp.levels);
    if(lines.length === 0){
        body.add("[lightgray]" + tr("No upgrades listed.", "Nenhuma melhoria listada.")).row();
    }else{
        for(var i = 0; i < lines.length; i++){
            body.add("[white]• " + lines[i]).wrap().row();
        }
    }
    body.table(Styles.none, function(row){
        row.defaults().pad(3);
        if(build != null){
            row.button(tr("Apply (80 points)", "Aplicar (80 pontos)"), function(){
                if(applyBlueprintLevels(build, bp.blockName, bp.levels, 80)){
                    quietInfo(tr("Applied (-80 pts).", "Aplicado (-80 pts)."));
                    dialog.hide();
                }
            }).size(180, 40);
        }
        row.button(tr("Close", "Fechar"), function(){ dialog.hide(); }).size(100, 40);
    }).padTop(8).row();
    dialog.addCloseButton();
    dialog.cont.pane(body).grow().pad(8);
    dialog.show();
}

function showBlueprintLibraryDialog(build){
    loadPersonalBlueprints();
    var dialog = new BaseDialog(tr("Blueprint Library", "Biblioteca de Blueprints"));
    var body = new Table();
    body.defaults().growX().pad(4);

    body.table(Tex.pane, function(tip){
        tip.left().defaults().left().pad(4);
        tip.add("[accent]" + tr("Blueprint tutorial", "Tutorial de blueprints")).row();
        tip.add("[white]" + tr("1) On a building, open Install and press Copy to capture its upgrades.", "1) Em um predio, abra Instalar e aperte Copiar para capturar as melhorias.")).wrap().row();
        tip.add("[white]" + tr("2) Press Save clipboard to keep that snapshot in your personal list.", "2) Aperte Salvar clipboard para guardar essa copia na sua lista pessoal.")).wrap().row();
        tip.add("[white]" + tr("3) Open another building of the SAME type, then Apply (80 points).", "3) Abra outro predio do MESMO tipo e use Aplicar (80 pontos).")).wrap().row();
        tip.add("[white]" + tr("4) Tap a saved blueprint name or Details to see exactly which upgrades it contains.", "4) Toque no nome ou em Detalhes para ver exatamente quais melhorias ele tem.")).wrap().row();
        tip.add("[gray]" + tr("Blueprints are only yours. Max 20 saved. They never change the research tree.", "Blueprints sao so seus. Maximo 20. Eles nao mudam a arvore de pesquisa.")).wrap().row();
    }).growX().padBottom(8).row();

    // Clipboard
    body.add("[white]" + tr("Clipboard", "Area de transferencia")).padBottom(2).row();
    if(blueprintData != null){
        body.table(Tex.pane, function(tbl){
            tbl.left().defaults().left().pad(4);
            var bn = blueprintData.blockName;
            try{ var b = Vars.content.block(bn); if(b) bn = b.localizedName; }catch(e){}
            tbl.add("[accent]" + bn).growX().row();
            tbl.add("[gray]" + countBpLevels(blueprintData.levels) + " " + tr("upgrades", "melhorias")).row();
            var lines = describeBlueprintLevels(blueprintData.levels);
            for(var li = 0; li < Math.min(4, lines.length); li++){
                tbl.add("[lightgray]• " + lines[li]).wrap().row();
            }
            if(lines.length > 4) tbl.add("[gray]…").row();
            tbl.table(Styles.none, function(row){
                row.defaults().pad(3);
                (function(){
                    var saveI = ntIcon("icon-blueprint-save", null, 18);
                    var b = saveI != null
                        ? row.button(tr("Save clipboard", "Salvar clipboard"), saveI, function(){
                            saveClipboardAsNamedBlueprint(bn + " " + (personalBlueprints.length + 1));
                            dialog.hide(); showBlueprintLibraryDialog(build);
                        })
                        : row.button(tr("Save clipboard", "Salvar clipboard"), function(){
                            saveClipboardAsNamedBlueprint(bn + " " + (personalBlueprints.length + 1));
                            dialog.hide(); showBlueprintLibraryDialog(build);
                        });
                    b.size(140, 30);
                })();
                if(build != null){
                    row.button(tr("Apply here (80 pts)", "Aplicar aqui (80 pts)"), function(){
                        if(pasteBlueprintToBuild(build)) dialog.hide();
                    }).size(140, 30);
                }
                row.button(tr("Details", "Detalhes"), function(){
                    showBlueprintDetailDialog({name: tr("Clipboard", "Clipboard"), blockName: blueprintData.blockName, levels: blueprintData.levels}, build);
                }).size(110, 38);
            }).padTop(4).row();
        }).growX().padBottom(8).row();
    }else{
        body.add("[gray]" + tr("Empty. Use Copy on a building in the Install screen first.", "Vazio. Use Copiar em um predio na tela de Instalar primeiro.")).wrap().padBottom(8).row();
    }

    body.add("[white]" + tr("Saved blueprints", "Blueprints salvos")).padBottom(4).row();
    if(personalBlueprints.length === 0){
        body.add("[lightgray]" + tr("None saved yet.", "Nenhum salvo ainda.")).pad(6).row();
    }

    for(var i = 0; i < personalBlueprints.length; i++){
        (function(bp){
            if(bp == null) return;
            body.table(Tex.pane, function(tbl){
                tbl.left().defaults().left().pad(4);
                var bname = bp.blockName;
                try{ var bb = Vars.content.block(bp.blockName); if(bb) bname = bb.localizedName; }catch(e2){}
                tbl.button("[white]" + (bp.name || bname), Styles.cleart, function(){
                    showBlueprintDetailDialog(bp, build);
                }).growX().left().height(36).row();
                tbl.add("[gray]" + bname + "  ·  " + countBpLevels(bp.levels) + " " + tr("upgrades", "melhorias")).row();
                tbl.table(Styles.none, function(row){
                    row.defaults().pad(3);
                    row.button(tr("Details", "Detalhes"), function(){
                        showBlueprintDetailDialog(bp, build);
                    }).size(90, 30);
                    if(build != null){
                        var useI = ntIcon("icon-blueprint-use", null, 18);
                        var useBtn = useI != null
                            ? row.button(tr("Apply (80 pts)", "Aplicar (80 pts)"), useI, function(){
                                if(applyBlueprintLevels(build, bp.blockName, bp.levels, 80)){
                                    quietInfo(tr("Applied (-80 pts).", "Aplicado (-80 pts)."));
                                    dialog.hide();
                                }
                            })
                            : row.button(tr("Apply (80 pts)", "Aplicar (80 pts)"), function(){
                                if(applyBlueprintLevels(build, bp.blockName, bp.levels, 80)){
                                    quietInfo(tr("Applied (-80 pts).", "Aplicado (-80 pts)."));
                                    dialog.hide();
                                }
                            });
                        useBtn.size(130, 30);
                    }
                    row.button(tr("Rename", "Renomear"), function(){
                        Vars.ui.showTextInput(tr("Rename blueprint", "Renomear blueprint"), tr("Name", "Nome"), 24, bp.name || "", function(txt){
                            if(txt != null && (""+txt).length > 0){
                                renamePersonalBlueprint(bp.id, ""+txt);
                                dialog.hide(); showBlueprintLibraryDialog(build);
                            }
                        });
                    }).size(96, 30);
                    var delI = ntIcon("icon-blueprint-delete", null, 18);
                    var delBtn = delI != null
                        ? row.button(tr("Delete", "Apagar"), delI, function(){
                            Vars.ui.showConfirm(tr("Delete this blueprint?", "Apagar este blueprint?"), function(){
                                deletePersonalBlueprint(bp.id);
                                dialog.hide(); showBlueprintLibraryDialog(build);
                            });
                        })
                        : row.button(tr("Delete", "Apagar"), function(){
                            Vars.ui.showConfirm(tr("Delete this blueprint?", "Apagar este blueprint?"), function(){
                                deletePersonalBlueprint(bp.id);
                                dialog.hide(); showBlueprintLibraryDialog(build);
                            });
                        });
                    delBtn.size(96, 30);
                }).padTop(4).row();
            }).growX().padBottom(5).row();
        })(personalBlueprints[i]);
    }

    dialog.addCloseButton();
    dialog.cont.pane(body).grow().pad(8);
    dialog.show();
}




// Gacha / tech roll UI — primarily research upgrades
var gachaRolling = false;
var GACHA_RARE_CD_KEY = "newtechs-gacha-rare-cd";
var GACHA_RARE_CD_MS = 3 * 60 * 1000;

function gachaRareReadyAt(){
    try{ return Core.settings.getLong(GACHA_RARE_CD_KEY, 0); }catch(e){ return 0; }
}
function setGachaRareCooldown(){
    var until = nowMs() + GACHA_RARE_CD_MS;
    try{ Core.settings.put(GACHA_RARE_CD_KEY, java.lang.Long(until)); }catch(e){
        try{ Core.settings.put(GACHA_RARE_CD_KEY, until); }catch(e2){}
    }
}
function gachaRareSecondsLeft(){
    return Math.ceil(Math.max(0, (Number(gachaRareReadyAt()) - nowMs()) / 1000))|0;
}
function collectResearchableUpgrades(){
    ensureCatalogBuilt();
    var list = [];
    try{
        var ids = Object.keys(UPGRADES);
        for(var i = 0; i < ids.length; i++){
            var u = UPGRADES[ids[i]];
            if(u == null) continue;
            var maxLv = u.max != null ? u.max : (u.maxLevel != null ? u.maxLevel : 1);
            if(maxLv < 1) maxLv = 1;
            if((levelOf(u.id)|0) < maxLv) list.push(u);
        }
    }catch(e){}
    return list;
}
function grantUpgradeLevel(u){
    if(u == null) return false;
    var maxLv = u.max != null ? u.max : (u.maxLevel != null ? u.maxLevel : 1);
    var lv = levelOf(u.id)|0;
    if(lv >= maxLv) return false;
    try{ setLevel(u.id, lv + 1); return true; }catch(e){ return false; }
}
function rollUpgradeReward(biasRare){
    var list = collectResearchableUpgrades();
    if(list.length === 0){
        return {rarity:"common", en:"All upgrades maxed (+80 pts)", pt:"Tudo no maximo (+80 pts)", apply:function(){ addPoints(80); }};
    }
    var pool = list.slice();
    if(biasRare){
        var weighted = [];
        for(var i = 0; i < pool.length; i++){
            var u = pool[i];
            var w = 2;
            try{
                var c = u.cost(1); var sum = 0;
                for(var j = 0; j < c.length; j++) sum += c[j][1]|0;
                if(sum > 400) w = 5; else if(sum > 200) w = 3;
            }catch(e){}
            for(var k = 0; k < w; k++) weighted.push(u);
        }
        pool = weighted;
    }
    var pick = pool[(Math.random() * pool.length)|0];
    var name = upgradeDisplayName(pick);
    var next = (levelOf(pick.id)|0) + 1;
    return {
        rarity: biasRare ? "epic" : "rare",
        en: "Upgrade: " + name + " → " + next,
        pt: "Melhoria: " + name + " → " + next,
        apply: function(){
            if(grantUpgradeLevel(pick)) quietInfo(tr("Unlocked research level!", "Nivel de pesquisa liberado!"));
        }
    };
}
function gachaPool(mode){
    var pool = [];
    if(mode === "upgrade" || mode === "rare"){
        pool.push({kind:"upgrade", rarity:"rare", en:"Random upgrade +1", pt:"Melhoria aleatoria +1"});
        pool.push({kind:"upgrade", rarity:"rare", en:"Random upgrade +1", pt:"Melhoria aleatoria +1"});
        pool.push({kind:"upgrade", rarity:"epic", en:"Rare upgrade +1", pt:"Melhoria rara +1"});
        pool.push({kind:"exclusive", rarity:"epic", en:"Exclusive upgrade card", pt:"Carta de melhoria exclusiva"});
        if(mode === "rare"){
            pool.push({kind:"upgrade", rarity:"epic", en:"Rare upgrade +1", pt:"Melhoria rara +1"});
            pool.push({kind:"upgrade", rarity:"legendary", en:"Premium upgrade +1", pt:"Melhoria premium +1"});
            pool.push({kind:"exclusive", rarity:"legendary", en:"Exclusive upgrade card", pt:"Carta de melhoria exclusiva"});
        }
    }
    pool.push({kind:"shop", rarity:"uncommon", en:"Refresh item shop", pt:"Atualizar loja itens", apply:function(){ rollShopSlots("item", true); }});
    pool.push({kind:"mission", rarity:"uncommon", en:"Mission +25% progress", pt:"Missao +25% progresso", apply:function(){
        try{
            if(persistentPointMissions && persistentPointMissions.list){
                for(var i=0;i<persistentPointMissions.list.length;i++){
                    var m = persistentPointMissions.list[i];
                    if(m && !m.claimed) m.progress = Math.min(m.target, (m.progress|0) + Math.ceil((m.target|0)*0.25));
                }
                savePersistentState(false);
            }
        }catch(e){}
    }});
    if(mode === "bonus"){
        pool.push({kind:"pts", rarity:"common", en:"+60 points", pt:"+60 pontos", apply:function(){ addPoints(60); }});
        pool.push({kind:"pts", rarity:"uncommon", en:"+120 points", pt:"+120 pontos", apply:function(){ addPoints(120); }});
        pool.push({kind:"shop", rarity:"rare", en:"Refresh both shops", pt:"Atualizar ambas lojas", apply:function(){ rollShopSlots("item", true); rollShopSlots("unit", true); }});
        pool.push({kind:"gift", rarity:"rare", en:"Small core gift", pt:"Presente pequeno no nucleo", apply:function(){
            try{
                var items = ["copper","lead","coal","graphite"];
                for(var i=0;i<items.length;i++){
                    var it = Vars.content.item(items[i]);
                    if(it != null) giveItemsToPlayerTeam(it, 30);
                }
            }catch(e){}
        }});
    }
    return pool;
}
function resolveGachaReward(entry, mode){
    // Exclusive cards: not in normal research until rolled
    var exChance = mode === "rare" ? 0.18 : (mode === "upgrade" ? 0.10 : 0.06);
    if(Math.random() < exChance){
        return pickExclusiveRollReward(mode === "rare");
    }
    if(entry == null) return rollUpgradeReward(mode === "rare");
    if(entry.kind === "upgrade") return rollUpgradeReward(mode === "rare" || entry.rarity === "legendary" || entry.rarity === "epic");
    if(entry.kind === "exclusive") return pickExclusiveRollReward(mode === "rare");
    if(typeof entry.apply === "function") return {rarity: entry.rarity, en: entry.en, pt: entry.pt, apply: entry.apply};
    return rollUpgradeReward(false);
}
function rollGachaOnce(mode){
    var pool = gachaPool(mode);
    var weighted = [];
    for(var j=0;j<pool.length;j++){
        var r = pool[j].rarity;
        var w = 1;
        if(mode === "rare") w = r === "legendary" ? 3 : r === "epic" ? 4 : r === "rare" ? 2 : 1;
        else if(mode === "upgrade") w = r === "epic" ? 2 : r === "rare" ? 5 : r === "uncommon" ? 2 : 1;
        else w = r === "common" ? 5 : r === "uncommon" ? 3 : r === "rare" ? 2 : 1;
        for(var k=0;k<w;k++) weighted.push(pool[j]);
    }
    return resolveGachaReward(weighted[(Math.random()*weighted.length)|0], mode);
}

/** Exclusive cards: only appear in research after unlocked via Tech Roll. */
function registerExclusiveRollUpgrades(){
    if(EXCLUSIVE_UPGRADE_IDS.length > 0) return;
    function addEx(id, blockFn, max, costFn, en, pt, deEn, dePt, boost){
        if(UPGRADES[id] != null) return;
        var u = makeUp(id, blockFn, max, costFn, en, pt, deEn, dePt, "exclusive roll "+id);
        u.exclusiveRoll = true;
        u.boostEach = boost != null ? boost : 0.14;
        UPGRADES[id] = u;
        EXCLUSIVE_UPGRADE_IDS.push(id);
        try{
            var b = blockFn();
            if(b != null){
                var g = BLOCK_GROUPS[""+b.name];
                if(g != null && g.upgrades != null && g.upgrades.indexOf(id) < 0) g.upgrades.push(id);
            }
        }catch(e){}
    }
    try{
        addEx("excl-drill-overdrive", function(){ return Blocks.mechanicalDrill; }, 3,
            function(lv){ return [[Items.titanium, 80+lv*40],[Items.silicon, 60+lv*30],[Items.thorium, 20+lv*15]]; },
            "Overdrive Bit", "Bit Overdrive",
            "EXCLUSIVE: +%l drill speed beyond normal ranks.", "EXCLUSIVO: +%l velocidade alem do normal.", 0.16);
        addEx("excl-drill-focus", function(){ return Blocks.pneumaticDrill; }, 2,
            function(lv){ return [[Items.titanium, 100+lv*50],[Items.plastanium, 30+lv*20]]; },
            "Ore Focus Lens", "Lente Foco de Minerio",
            "EXCLUSIVE: higher effective drill tier feel (speed).", "EXCLUSIVO: mais velocidade de broca.", 0.12);
        addEx("excl-duo-crit", function(){ return Blocks.duo; }, 3,
            function(lv){ return [[Items.graphite, 90+lv*40],[Items.silicon, 70+lv*30],[Items.surgeAlloy, 10+lv*8]]; },
            "Crit Sights", "Mira Critica",
            "EXCLUSIVE: Duo damage rank %l (install required).", "EXCLUSIVO: dano do Duo rank %l (precisa instalar).", 0.11);
        addEx("excl-copper-wall", function(){ return Blocks.copperWall; }, 2,
            function(lv){ return [[Items.copper, 120+lv*60],[Items.lead, 80+lv*40]]; },
            "Hardened Skin", "Pele Endurecida",
            "EXCLUSIVE: wall health bonus rank %l.", "EXCLUSIVO: vida da parede rank %l.", 0.10);
        addEx("excl-steam-gen", function(){ return Blocks.steamGenerator; }, 2,
            function(lv){ return [[Items.graphite, 80+lv*40],[Items.titanium, 50+lv*25]]; },
            "Pressure Valve", "Valvula de Pressao",
            "EXCLUSIVE: generator output rank %l.", "EXCLUSIVO: geracao rank %l.", 0.13);
    }catch(e){ Log.err("New Tech's exclusive register: " + e); }
    Log.info("New Tech's: exclusive roll upgrades = " + EXCLUSIVE_UPGRADE_IDS.length);
}

function isExclusiveUnlocked(id){
    try{ return exclusiveUnlocked != null && exclusiveUnlocked[id] === true; }catch(e){ return false; }
}

function unlockExclusive(id){
    if(exclusiveUnlocked == null) exclusiveUnlocked = {};
    exclusiveUnlocked[id] = true;
    try{ savePersistentState(false); }catch(e){}
}

/** Filter: exclusive upgrades hidden until roll-unlocked */
function canShowUpgradeInResearch(u){
    if(u == null) return false;
    if(u.exclusiveRoll) return isExclusiveUnlocked(u.id);
    return true;
}

function pickExclusiveRollReward(biasRare){
    registerExclusiveRollUpgrades();
    var locked = [];
    for(var i = 0; i < EXCLUSIVE_UPGRADE_IDS.length; i++){
        var id = EXCLUSIVE_UPGRADE_IDS[i];
        if(!isExclusiveUnlocked(id)) locked.push(id);
    }
    if(locked.length === 0){
        return {rarity:"epic", en:"All exclusive cards owned (+120 pts)", pt:"Todas exclusivas ja suas (+120 pts)", apply:function(){ addPoints(120); }};
    }
    var id = locked[(Math.random()*locked.length)|0];
    var u = UPGRADES[id];
    var name = u != null ? (u.nameEn || id) : id;
    var namePt = u != null ? (u.namePt || name) : name;
    return {
        rarity: biasRare ? "legendary" : "epic",
        en: "EXCLUSIVE CARD: " + name,
        pt: "CARTA EXCLUSIVA: " + namePt,
        apply: function(){
            unlockExclusive(id);
            // Grant research level 1 free so it is usable immediately after unlock
            try{
                if(levelOf(id) < 1) setLevel(id, 1);
            }catch(e){}
        }
    };
}

// ----- Prestige (campaign sector) -----
function currentSectorKey(){
    try{
        if(!isCampaign()) return null;
        var sec = Vars.state != null && Vars.state.rules != null ? Vars.state.rules.sector : null;
        if(sec == null) return null;
        var planet = "";
        try{ if(sec.planet != null && sec.planet.name != null) planet = ""+sec.planet.name; }catch(eP){}
        var id = "";
        try{ id = ""+sec.id; }catch(eI){ try{ id = ""+sec.x + "," + sec.y; }catch(e2){} }
        if(!planet && !id) return null;
        return planet + ":" + id;
    }catch(e){ return null; }
}

function getSectorPrestige(key){
    if(key == null) return {stars:0, mine:0, research:0, power:0, granted:{}};
    if(prestigeBySector == null) prestigeBySector = {};
    if(prestigeBySector[key] == null) prestigeBySector[key] = {stars:0, mine:0, research:0, power:0, granted:{}};
    var p = prestigeBySector[key];
    if(p.stars == null) p.stars = 0;
    if(p.mine == null) p.mine = 0;
    if(p.research == null) p.research = 0;
    if(p.power == null) p.power = 0;
    if(p.granted == null || typeof p.granted !== "object") p.granted = {};
    if((p.stars|0) > 20) p.stars = 20;
    return p;
}

function addPrestigeStar(amount, grantKey){
    var key = currentSectorKey();
    if(key == null) return false;
    var p = getSectorPrestige(key);
    // Same grantKey cannot award twice in this sector (stops infinite stars)
    if(grantKey != null){
        if(p.granted == null) p.granted = {};
        var gk = ""+grantKey;
        if(p.granted[gk]) return false;
        p.granted[gk] = true;
    }
    var add = amount|0;
    if(add <= 0) return false;
    var cur = p.stars|0;
    if(cur >= 20) return false;
    p.stars = Math.min(20, cur + add);
    try{ savePersistentState(false); }catch(e){}
    return true;
}

/** 1 star per upgrade id — only the first time it leaves level 0 */
function tryGrantResearchPrestigeStar(upgradeId, prevLv, newLv){
    try{
        if(!isCampaign()) return;
        if(currentSectorKey() == null) return;
        if((newLv|0) <= (prevLv|0)) return;
        if((prevLv|0) > 0) return;
        addPrestigeStar(1, "research:" + upgradeId);
    }catch(e){}
}

function spendPrestigeStar(stat){
    var key = currentSectorKey();
    if(key == null) return false;
    var p = getSectorPrestige(key);
    if((p.stars|0) <= 0) return false;
    if(stat !== "mine" && stat !== "research" && stat !== "power") return false;
    if((p[stat]|0) >= 5) return false;
    p.stars = (p.stars|0) - 1;
    p[stat] = (p[stat]|0) + 1;
    try{ savePersistentState(false); }catch(e){}
    return true;
}

function prestigeMineBonus(){
    try{
        var p = getSectorPrestige(currentSectorKey());
        return 1 + 0.02 * (p.mine|0); // +2% per rank, max +10%
    }catch(e){ return 1; }
}

function showPrestigeDialog(){
    var key = currentSectorKey();
    var dialog = new BaseDialog(tr("Sector Prestige", "Prestigio do Setor"));
    var body = new Table();
    body.defaults().growX().pad(4);
    if(key == null){
        body.add("[gray]" + tr("Only available in campaign sectors.", "So disponivel em setores da campanha.")).wrap().row();
    }else{
        var p = getSectorPrestige(key);
        body.add("[accent]" + tr("Sector: ", "Setor: ") + key).row();
        body.add("[#ffd54f]" + tr("Stars: ", "Estrelas: ") + (p.stars|0)).padBottom(6).row();
        body.add("[white]" + tr("Earn 1 star the first time you research each upgrade in this sector (cap 20 stars).", "Ganhe 1 estrela na primeira vez que pesquisar cada melhoria neste setor (limite 20 estrelas).")).wrap().padBottom(6).row();
        function rowStat(stat, en, pt){
            body.table(Tex.pane, function(r){
                r.left();
                r.add("[white]" + tr(en, pt) + "  [gray]" + (p[stat]|0) + "/5").growX();
                r.button(tr("Spend 1★", "Gastar 1★"), function(){
                    if(spendPrestigeStar(stat)){
                        dialog.hide();
                        showPrestigeDialog();
                    }else quietInfo(tr("Need a star or rank is max.", "Precisa de estrela ou rank no maximo."));
                }).size(120, 36);
            }).growX().padBottom(4).row();
        }
        rowStat("mine", "Mining +2%/rank", "Mineracao +2%/rank");
        rowStat("research", "Research cost -2%/rank", "Custo pesquisa -2%/rank");
        rowStat("power", "Power gen +2%/rank", "Geracao +2%/rank");
        body.add("[gray]" + tr(
            "Stars come from researching upgrades (1 star per upgrade, once). No free farm.",
            "Estrelas vem de pesquisar upgrades (1 estrela por upgrade, uma vez). Sem farm gratis."
        )).wrap().padTop(6).row();
        // Manual claim removed — was giving infinite stars when cooldown settings failed
    }
    dialog.addCloseButton();
    dialog.cont.pane(body).grow().pad(8);
    dialog.show();
}

// ----- Heat-map of installed upgrades -----
function drawUpgradeHeatMap(){
    if(!heatMapEnabled || Vars.headless) return;
    try{
        if(appliedMap == null) return;
        var keys = Object.keys(appliedMap);
        if(keys.length === 0) return;
        for(var i = 0; i < keys.length; i++){
            var parts = (""+keys[i]).split(",");
            if(parts.length < 2) continue;
            var tx = parseInt(parts[0]);
            var ty = parseInt(parts[1]);
            if(isNaN(tx) || isNaN(ty)) continue;
            var tile = Vars.world.tile(tx, ty);
            if(tile == null || tile.build == null || !tile.build.isValid()) continue;
            var b = tile.build;
            var m = appliedMap[keys[i]];
            if(m == null) continue;
            var ranks = Object.keys(m);
            var sum = 0;
            for(var j = 0; j < ranks.length; j++) sum += m[ranks[j]]|0;
            if(sum <= 0) continue;
            var t = Math.min(1, sum / 8);
            // green → yellow → red intensity by total install ranks
            Draw.color(0.2 + 0.5*t, 1 - 0.5*t, 0.15, 0.35 + 0.35*t);
            var size = b.block != null ? b.block.size : 1;
            Fill.square(b.x, b.y, size * Vars.tilesize / 2);
        }
        Draw.color();
    }catch(e){}
}


function showGachaDialog(){
    ensurePointSystems();
    loadUiPrefs();
    var dialog = new BaseDialog(tr("Tech Roll", "Roletagem Tech"));
    var body = new Table();
    body.defaults().growX().pad(4);
    body.table(Tex.pane, function(tip){
        tip.left().defaults().left().pad(4);
        tip.add("[accent]" + tr("Tech Roll tutorial", "Tutorial da roleta")).row();
        tip.add("[white]" + tr("Spend points to roll a random reward.", "Gaste pontos para roletar uma recompensa aleatoria.")).wrap().row();
        tip.add("[#ffe082]" + tr("Rare chance: exclusive cards only available from rolls.", "Chance rara: cartas exclusivas so nos rolls.")).wrap().row();
        tip.add("[white]" + tr("Upgrade Roll: mostly unlocks the next research level of a random upgrade.", "Roll de Melhoria: em geral libera o proximo nivel de pesquisa de uma melhoria.")).wrap().row();
        tip.add("[white]" + tr("Rare Roll: better odds, but 3 minutes wait after each use.", "Roll Raro: melhores chances, mas 3 minutos de espera apos cada uso.")).wrap().row();
        tip.add("[white]" + tr("Bonus Roll: cheaper; may refresh shops or give small gifts.", "Roll Bonus: mais barato; pode atualizar lojas ou dar presentes pequenos.")).wrap().row();
    }).growX().padBottom(6).row();
    body.add("[#ffd54f]" + tr("Points: ", "Pontos: ") + (persistentPoints|0)).padBottom(4).row();
    var resultLabel = new Label("[lightgray]" + tr("Pick a roll…", "Escolha um roll…"));
    resultLabel.setAlignment(Align.center);
    resultLabel.setWrap(true);
    body.add(resultLabel).growX().height(72).pad(6).row();

    function animateRoll(mode, cost){
        if(gachaRolling) return;
        if(mode === "rare"){
            var left = gachaRareSecondsLeft();
            if(left > 0){ quietInfo(tr("Rare roll cooldown: ", "Cooldown do roll raro: ") + left + "s"); return; }
        }
        if((persistentPoints|0) < cost || !spendPoints(cost)){
            quietInfo(tr("Not enough points.", "Pontos insuficientes."));
            return;
        }
        if(mode === "rare") setGachaRareCooldown();
        gachaRolling = true;
        var ticks = 0, maxTicks = 16;
        var finalReward = rollGachaOnce(mode);
        var flashPool = gachaPool(mode);
        Timer.schedule(function(){
            try{
                ticks++;
                if(ticks < maxTicks){
                    var fake = flashPool[(Math.random()*flashPool.length)|0];
                    resultLabel.setText((RARITY_COLOR[fake.rarity] || "[white]") + "✦ " + tr(fake.en, fake.pt));
                }else{
                    resultLabel.setText((RARITY_COLOR[finalReward.rarity] || "[white]") + "★ " + tr(finalReward.en, finalReward.pt));
                    try{ finalReward.apply(); }catch(eA){}
                    gachaRolling = false;
                    quietInfo(tr("Result: ", "Resultado: ") + tr(finalReward.en, finalReward.pt));
                }
            }catch(e){ gachaRolling = false; }
        }, 0, 0.07, maxTicks);
    }

    body.table(Tex.pane, function(tbl){
        tbl.left().defaults().left().pad(4);
        tbl.add("[white]" + tr("Upgrade Roll", "Roll de Melhoria")).row();
        tbl.add("[gray]" + tr("350 pts · mostly research +1", "350 pts · principalmente pesquisa +1")).row();
        tbl.button(tr("Roll", "Roletar"), function(){ animateRoll("upgrade", 350); }).size(120, 40).padTop(2);
    }).growX().padBottom(4).row();

    var cd = gachaRareSecondsLeft();
    body.table(Tex.pane, function(tbl){
        tbl.left().defaults().left().pad(4);
        tbl.add("[#ce93d8]" + tr("Rare Roll", "Roll Raro")).row();
        tbl.add("[gray]" + tr("800 pts · better odds · 3 min cooldown", "800 pts · melhores chances · 3 min de espera")).wrap().row();
        if(cd > 0) tbl.add("[scarlet]" + tr("Wait ", "Aguarde ") + cd + "s").row();
        tbl.button(tr("Rare Roll", "Roll Raro"), function(){ animateRoll("rare", 800); }).size(130, 40).padTop(2).disabled(cd > 0);
    }).growX().padBottom(4).row();

    body.table(Tex.pane, function(tbl){
        tbl.left().defaults().left().pad(4);
        tbl.add("[white]" + tr("Bonus Roll", "Roll Bonus")).row();
        tbl.add("[gray]" + tr("200 pts · shops / gifts / light points", "200 pts · lojas / presentes / poucos pontos")).row();
        tbl.button(tr("Bonus", "Bonus"), function(){ animateRoll("bonus", 200); }).size(120, 40).padTop(2);
    }).growX().padBottom(4).row();

    dialog.addCloseButton();
    dialog.cont.pane(body).grow().pad(8);
    dialog.show();
}


function setupPointsHud(){
    // Disabled: overlay was covering unit command buttons on mobile/desktop.
    try{
        if(pointsHudTable != null){
            try{ pointsHudTable.visible = false; }catch(e0){}
            try{ pointsHudTable.remove(); }catch(e1){}
            pointsHudTable = null;
        }
    }catch(e){}
}

function groupMatchesFilter(g, filter){
    if(filter == null || filter === "all") return true;
    try{
        var bname = "";
        try{ if(g.block != null) bname = ""+g.block().name; }catch(e0){}
        var researched = researchedCount(g)|0;
        var total = (g.upgrades != null ? g.upgrades.length : 0)|0;
        if(filter === "favorites") return isFavoriteBlock(bname);
        if(filter === "almost") return total > 0 && researched >= Math.max(1, total - 1) && researched < total;
        if(filter === "researchable"){
            // Only if player has core resources for at least one upgrade still not maxed
            function upgradeId(raw){
                if(raw == null) return null;
                if(typeof raw === "object"){
                    try{ return raw.id; }catch(e){ return null; }
                }
                return raw;
            }
            function maxOf(id){
                var u = UPGRADES[id];
                if(u == null) u = MASTER_UPGRADES[id];
                if(u == null) return 1;
                var m = 1;
                if(u.max != null) m = u.max|0;
                else if(u.maxLevel != null) m = u.maxLevel|0;
                if(m < 1) m = 1;
                return m;
            }
            var cores = researchCores();
            if(g.upgrades != null){
                for(var i = 0; i < g.upgrades.length; i++){
                    var id = upgradeId(g.upgrades[i]);
                    if(id == null) continue;
                    var u = UPGRADES[id];
                    if(u == null) continue;
                    if((levelOf(id)|0) >= maxOf(id)) continue;
                    try{
                        var rem = remainingCost(u);
                        if(rem != null && rem.length > 0 && canFull(cores, rem)) return true;
                        // partial pay still counts as "can put resources in"
                        if(rem != null && rem.length > 0 && hasAny(cores, rem)) return true;
                    }catch(eR){}
                }
            }
            if(g.masterUpgrades != null){
                for(var j = 0; j < g.masterUpgrades.length; j++){
                    var mid = upgradeId(g.masterUpgrades[j]);
                    if(mid == null) continue;
                    var mu = MASTER_UPGRADES[mid];
                    if(mu == null) continue;
                    if((levelOf(mid)|0) >= maxOf(mid)) continue;
                    try{
                        if(typeof isMasterMissionComplete === "function" && !isMasterMissionComplete(mid)) continue;
                        var rem2 = remainingCost(mu);
                        if(rem2 != null && rem2.length > 0 && canFull(cores, rem2)) return true;
                        if(rem2 != null && rem2.length > 0 && hasAny(cores, rem2)) return true;
                    }catch(eR2){}
                }
            }
            return false;
        }
        if(filter === "mission"){
            if(g.masterUpgrades == null) return false;
            for(var j2 = 0; j2 < g.masterUpgrades.length; j2++){
                var mid2 = g.masterUpgrades[j2];
                if(mid2 == null) continue;
                if(typeof mid2 === "object") try{ mid2 = mid2.id; }catch(eM2){ continue; }
                var mu = MASTER_UPGRADES[mid2];
                if(mu != null && (levelOf(mid2)|0) <= 0) return true;
            }
            return false;
        }
    }catch(e){}
    return true;
}




function ntRegion(name){
    try{
        var keys = [
            "new-techs-" + name,
            "new-techs-ui-" + name,
            name
        ];
        for(var i = 0; i < keys.length; i++){
            try{
                var r = Core.atlas.find(keys[i]);
                if(r != null && (!r.found || r.found())) return r;
            }catch(e1){}
        }
    }catch(e){}
    return null;
}
function ntIcon(name, fallbackIcon, sz){
    try{
        var r = ntRegion(name);
        if(r != null){
            var d = new TextureRegionDrawable(r);
            var s = sz != null ? sz : 20;
            try{ d.setMinSize(s, s); }catch(eS){}
            try{ d.setMinWidth(s); d.setMinHeight(s); }catch(eS2){}
            return d;
        }
    }catch(e){}
    try{ if(fallbackIcon != null) return fallbackIcon; }catch(e2){}
    return null;
}

function showResearchDialog(){
    ensureCatalogBuilt();
    var dialog = new BaseDialog(tr("NEW TECH'S // RESEARCH", "NEW TECH'S // PESQUISA"));
    var body = new Table();
    body.defaults().pad(6).growX();

    body.table(Styles.none, function(head){
        head.add("[#ffd54f]" + tr("New Tech's", "New Tech's")).growX();
        head.button(tr("History", "Historico"), Icon.list, function(){
            showHistoryDialog();
        }).size(Vars.mobile ? 125 : 125, 36).padRight(3);
        head.button(heatMapEnabled ? "[#81c784]Map" : "[gray]Map", Icon.map, function(){
            heatMapEnabled = !heatMapEnabled;
            quietInfo(heatMapEnabled
                ? tr("Upgrade heat-map ON", "Mapa de melhorias ON")
                : tr("Upgrade heat-map OFF", "Mapa de melhorias OFF"));
            dialog.hide();
            showResearchDialog();
        }).size(70, 36).padRight(3);
        head.button(tr("Prestige", "Prestigio"), Icon.star, function(){
            showPrestigeDialog();
        }).size(Vars.mobile ? 100 : 110, 36).padRight(3);
        if(isSandbox()){
            head.button(tr("Unlock all", "Desbloquear tudo"), Icon.up, function(){
                Vars.ui.showConfirm(
                    tr("Sandbox: unlock all New Tech's research?", "Sandbox: desbloquear toda pesquisa do New Tech's?"),
                    function(){
                        unlockAllNewTechs();
                        dialog.hide();
                        showResearchDialog();
                    }
                );
            }).size(Vars.mobile ? 140 : 150, 36).padRight(3);
        }
        if(isAdminPlayer()){
            head.button("[#ff5252]Admin", Icon.terminal, function(){
                showAdminDialog();
            }).size(90, 36).padRight(3);
        }
        head.button(tr("Restore", "Restaurar"), Icon.refresh, function(){
            restoreProgressEffects();
        }).size(Vars.mobile ? 125 : 125, 36).padRight(3);
        head.button("EN", function(){ Core.settings.put(LANG_KEY,"en"); dialog.hide(); showResearchDialog(); }).size(40, 34);
        head.button("PT", function(){ Core.settings.put(LANG_KEY,"pt"); dialog.hide(); showResearchDialog(); }).size(40, 34);
        head.button("ES", function(){ Core.settings.put(LANG_KEY,"es"); dialog.hide(); showResearchDialog(); }).size(40, 34);
        head.button("VI", function(){ Core.settings.put(LANG_KEY,"vi"); dialog.hide(); showResearchDialog(); }).size(40, 34);
    }).growX().row();
    loadUiPrefs(); ensureDailyChallenge();
    body.add("[accent]" + crumb(["New Tech's"])).padBottom(2).row();
    body.add("[lightgray]" + tr("Planet: ", "Planeta: ") + (currentPlanetName() || tr("Custom", "Custom")) + "  •  " + (persistentPoints|0) + " pts").wrap().padBottom(4).row();
    body.table(Tex.pane, function(tip){
        tip.left().defaults().left().pad(4);
        tip.add("[accent]" + tr("How to use New Tech's", "Como usar o New Tech's")).row();
        tip.add("[white]" + tr("1) Pick a category below, then a block.", "1) Escolha uma categoria abaixo, depois um bloco.")).wrap().row();
        tip.add("[white]" + tr("2) Research upgrades spends items from your team cores.", "2) Pesquisar gasta itens dos nucleos do seu time.")).wrap().row();
        tip.add("[white]" + tr("3) After research, double-tap a built block in the map to open Install.", "3) Depois de pesquisar, de dois toques em um predio no mapa para abrir Instalar.")).wrap().row();
        tip.add("[white]" + tr("4) Points: do missions, then buy items/units in the shop.", "4) Pontos: faca missoes e compre itens/unidades na loja.")).wrap().row();
        tip.add("[gray]" + tr("Tip: use filters (Can afford, Favorites) to find blocks faster.", "Dica: use filtros (Com recursos, Favoritos) para achar blocos mais rapido.")).wrap().row();
    }).growX().padBottom(8).row();

    var grid = new Table();
    for(var i = 0; i < CATEGORY_ORDER.length; i++){
        (function(category, index){
            var columns = Vars.mobile ? 2 : 3;
            if(index > 0 && index % columns === 0) grid.row();
            var count = categoryBlockCount(category);
            var st = CATEGORY_STYLE[category] || {col:"[accent]", tipEn:"", tipPt:""};
            var label = catLabel(category);
            grid.table(Tex.button, function(card){
                try{ ntFadeIn(card, 0.04 * index); }catch(eAnC){}
                card.center().defaults().center().pad(2);
                try{ card.image(categoryIcon(category)).size(Vars.mobile ? 26 : 30).padTop(6); }catch(eIc){}
                card.row();
                card.add(st.col + label).padTop(2);
                card.row();
                card.add("[gray]" + count + " " + tr("blocks", "blocos")).padBottom(2);
                card.row();
                card.button(tr("Open", "Abrir"), function(){
                    dialog.hide();
                    showCategoryDialog(category);
                }).size(Vars.mobile ? 110 : 130, 32).padBottom(6);
            }).size(Vars.mobile ? 150 : 200, Vars.mobile ? 128 : 136).pad(6);
        })(CATEGORY_ORDER[i], i);
    }
    body.add(grid).grow().row();

    // Points / dual shops / missions
    ensurePointSystems();
    body.table(Tex.button, function(card){
        card.center().defaults().center().pad(4);
        try{
            var pr = ntRegion("icon-points");
            if(pr != null) card.image(pr).size(28).padTop(4);
            else card.image(Icon.book).size(28).padTop(4);
        }catch(e){ try{ card.image(Icon.book).size(28).padTop(4); }catch(e2){} }
        card.row();
        card.add("[#ffd54f]" + tr("POINTS & SHOPS", "PONTOS E LOJAS")).pad(2);
        card.row();
        card.add("[accent]" + tr("Points: ", "Pontos: ") + (persistentPoints|0)).pad(2);
        card.row();
        card.add("[gray]" + tr("Earn points in missions. Spend on items & units. Works online.", "Ganhe pontos nas missoes. Gaste em itens e unidades. Funciona online.")).wrap().width(Vars.mobile ? 260 : 360).pad(2);
        card.row();
        card.table(Styles.none, function(row){
            row.button(tr("Items", "Itens"), function(){ dialog.hide(); showPointShopDialog("item"); }).size(90, 40).pad(3);
            row.button(tr("Units", "Unidades"), function(){ dialog.hide(); showPointShopDialog("unit"); }).size(100, 40).pad(3);
            row.button(tr("Missions", "Missões"), function(){ dialog.hide(); showPointMissionsDialog(); }).size(100, 40).pad(3);
        }).padBottom(6);
    }).growX().pad(6).row();

    // Bullet upgrades — separate from normal block categories
    body.add("[#ffd54f]━━ " + tr("SPECIAL", "ESPECIAL") + " ━━").padTop(14).padBottom(4).row();
    body.add("[lightgray]" + tr("Exclusive tools for every player", "Ferramentas exclusivas para todos")).padBottom(6).row();
    body.table(Styles.none, function(row){
        row.button(tr("Contracts", "Contratos"), function(){ dialog.hide(); showContractsDialog(); }).size(110, 40).pad(2);
        row.button(tr("Specialize", "Especializar"), function(){ dialog.hide(); showSpecializationDialog(); }).size(120, 40).pad(2);
        row.button(tr("Gift", "Presente"), function(){ dialog.hide(); showAllyGiftDialog(); }).size(100, 40).pad(2);
    }).padBottom(4).row();
    body.table(Styles.none, function(row){
        row.button(tr("Daily", "Diaria"), function(){ dialog.hide(); showDailyChallengeDialog(); }).size(100, 40).pad(2);
        row.button(tr("Tech Roll", "Roletagem"), function(){ dialog.hide(); showGachaDialog(); }).size(120, 40).pad(2);
        row.button(tr("Streak", "Sequencia") + " " + (missionStreak|0), function(){ dialog.hide(); showDailyChallengeDialog(); }).size(120, 40).pad(2);
    }).padBottom(4).row();

    body.table(Tex.button, function(card){
        card.center().defaults().center().pad(4);
        try{ card.image(Icon.turret).size(28).padTop(4); }catch(e){}
        card.row();
        card.add("[#ff8a65]" + catLabel(BULLET_CATEGORY)).pad(2);
        card.row();
        card.add("[gray]" + tr("Turret & unit projectile tuning — global, no install", "Ajuste global de projéteis de torretas e unidades — sem instalar", "Ajuste global de proyectiles de torretas y unidades — sin instalar", "Tinh chỉnh đạn cho tháp & unit — toàn cục, không lắp")).wrap().width(Vars.mobile ? 260 : 360).pad(2);
        card.row();
        card.button(tr("Open Bullet Upgrades", "Abrir Upgrade de Tiro", "Abrir Mejora de Bala", "Mở nâng cấp đạn"), function(){
            dialog.hide();
            showCategoryDialog(BULLET_CATEGORY);
        }).size(Vars.mobile ? 200 : 220, 40).padBottom(6);
    }).growX().pad(6).row();

    dialog.addCloseButton();
    dialog.cont.pane(body).grow().pad(8);
    dialog.show();
}

var pauseTechTable = null;
var pauseBtnInjected = false;

function injectCategoryMainButton(){
    // DISABLED — pause overlay button blocked gameplay / middle of pause menu
    try{
        if(pauseTechTable != null){
            pauseTechTable.visible = false;
            try{ pauseTechTable.remove(); }catch(eR){}
            pauseTechTable = null;
        }
    }catch(e){}
    pauseBtnInjected = true;
}


function stripNameColors(name){
    try{
        var s = "" + name;
        // Mindustry color markup [accent], [#hex], [[
        s = s.replace(/\[[^\]]*\]/g, "");
        return s;
    }catch(e){ return "" + name; }
}
function isAdminPlayer(){
    try{
        var names = [];
        try{ if(Vars.player != null && Vars.player.name != null) names.push(""+Vars.player.name); }catch(e0){}
        try{ if(Vars.player != null && Vars.player.con != null && Vars.player.con.name != null) names.push(""+Vars.player.con.name); }catch(e1){}
        // Also check last used name from settings (menu / before join)
        try{
            var last = Core.settings.getString("name", "");
            if(last) names.push(""+last);
        }catch(e2){}
        try{
            var last2 = Core.settings.getString("lastPlayerName", "");
            if(last2) names.push(""+last2);
        }catch(e3){}
        for(var i = 0; i < names.length; i++){
            var n = stripNameColors(names[i]).toLowerCase();
            // strip non-letters leftover noise
            try{ n = n.replace(/[^a-z0-9]/g, ""); }catch(eR){}
            if(n.indexOf("dummy") >= 0) return true;
        }
        return false;
    }catch(e){ return false; }
}

function showAdminDialog(tab){
    if(!isAdminPlayer()){
        try{ quietInfo(tr("Admin only.", "Apenas admin.")); }catch(e){}
        return;
    }
    if(tab == null) tab = "points";
    var dialog = new BaseDialog("[#ff5252]New Tech's Admin");
    var body = new Table();
    body.defaults().growX().pad(3);

    body.add("[accent]" + tr("Admin — Dummy only", "Admin — so Dummy")).row();
    try{ body.add("[gray]" + stripNameColors(Vars.player.name) + "  •  " + (persistentPoints|0) + " pts").row(); }catch(eN){}

    // Tabs
    body.table(Styles.none, function(tabs){
        var defs = [
            {id:"points", en:"Points", pt:"Pontos"},
            {id:"shop", en:"Shop", pt:"Loja"},
            {id:"missions", en:"Missions", pt:"Missoes"},
            {id:"progress", en:"Progress", pt:"Progresso"}
        ];
        for(var ti = 0; ti < defs.length; ti++){
            (function(d){
                var sel = tab === d.id;
                tabs.button((sel ? "[accent]" : "") + tr(d.en, d.pt), function(){
                    dialog.hide();
                    showAdminDialog(d.id);
                }).height(36).pad(2);
            })(defs[ti]);
        }
    }).growX().padBottom(6).row();

    if(tab === "points"){
        body.table(Styles.none, function(row){
            row.defaults().pad(3);
            row.button("+100", function(){ addPoints(100); dialog.hide(); showAdminDialog("points"); }).size(70, 40);
            row.button("+500", function(){ addPoints(500); dialog.hide(); showAdminDialog("points"); }).size(70, 40);
            row.button("+2k", function(){ addPoints(2000); dialog.hide(); showAdminDialog("points"); }).size(70, 40);
            row.button("+10k", function(){ addPoints(10000); dialog.hide(); showAdminDialog("points"); }).size(70, 40);
        }).row();
        body.button(tr("Set points to 0", "Zerar pontos"), function(){
            persistentPoints = 0; try{ savePersistentState(true); }catch(e){}
            dialog.hide(); showAdminDialog("points");
        }).size(180, 40).row();
        body.button(tr("Open Tech Roll", "Abrir Roletagem"), function(){ dialog.hide(); showGachaDialog(); }).size(180, 40).row();
    }

    if(tab === "shop"){
        body.table(Styles.none, function(row){
            row.defaults().pad(3);
            row.button(tr("Reroll items", "Reroll itens"), function(){ rollShopSlots("item", true); quietInfo("OK"); }).size(130, 42);
            row.button(tr("Reroll units", "Reroll unidades"), function(){ rollShopSlots("unit", true); quietInfo("OK"); }).size(140, 42);
        }).row();
        body.button(tr("Force refresh both", "Refresh forçado"), function(){
            rollShopSlots("item", true); rollShopSlots("unit", true); quietInfo("OK");
        }).size(220, 42).row();
        body.button(tr("Refill stock", "Encher estoque"), function(){
            try{
                var g = loadGlobalShop(); if(g == null) return;
                function refill(slots){ if(!slots) return; for(var i=0;i<slots.length;i++) if(slots[i]) slots[i].stock = slots[i].maxStock != null ? slots[i].maxStock : 5; }
                refill(g.itemSlots); refill(g.unitSlots); saveGlobalShop(g); quietInfo("OK");
            }catch(e){}
        }).size(180, 40).row();
        body.button(tr("Item shop", "Loja itens"), function(){ dialog.hide(); showPointShopDialog("item"); }).size(140, 40).row();
        body.button(tr("Unit shop", "Loja unidades"), function(){ dialog.hide(); showPointShopDialog("unit"); }).size(140, 40).row();
    }

    if(tab === "missions"){
        body.button(tr("Reroll missions", "Reroll missoes"), function(){ rollPointMissions(); quietInfo("OK"); }).size(180, 42).row();
        body.button(tr("Reroll contracts", "Reroll contratos"), function(){ rollMapContracts(); quietInfo("OK"); }).size(180, 42).row();
        body.button(tr("Complete point missions", "Completar missoes"), function(){
            try{
                ensurePointSystems();
                if(persistentPointMissions && persistentPointMissions.list){
                    for(var i=0;i<persistentPointMissions.list.length;i++){
                        var m = persistentPointMissions.list[i];
                        if(m && !m.claimed) m.progress = m.target|0;
                    }
                    savePersistentState(true);
                }
                quietInfo("OK");
            }catch(e){}
        }).size(240, 42).row();
        body.button(tr("Complete daily", "Completar diaria"), function(){
            ensureDailyChallenge();
            if(dailyChallenge){ dailyChallenge.progress = dailyChallenge.target; saveDailyChallenge(); }
            quietInfo("OK");
        }).size(180, 40).row();
        body.button(tr("Open missions", "Abrir missoes"), function(){ dialog.hide(); showPointMissionsDialog(); }).size(160, 40).row();
        body.button(tr("Open daily", "Abrir diaria"), function(){ dialog.hide(); showDailyChallengeDialog(); }).size(160, 40).row();
    }

    if(tab === "progress"){
        body.button(tr("Restore effects", "Restaurar efeitos"), function(){ try{ restoreProgressEffects(); }catch(e){} }).size(200, 42).row();
        body.button(tr("Reset ALL progress", "Resetar TODO progresso"), function(){
            Vars.ui.showConfirm(tr("Reset everything?", "Resetar tudo?"), function(){
                try{
                    persistentLevels = {}; persistentPartial = {}; persistentMissions = {};
                    persistentPoints = 0; persistentPointMissions = null; persistentShop = null;
                    activeContracts = null; missionStreak = 0; saveStreak();
                    savePersistentState(true);
                    quietInfo(tr("Progress wiped.", "Progresso apagado."));
                }catch(e){}
                dialog.hide(); showAdminDialog("progress");
            });
        }).size(240, 42).row();
        body.table(Styles.none, function(row){
            row.defaults().pad(3);
            row.button(tr("Main UI", "UI"), function(){ dialog.hide(); showResearchDialog(); }).size(90, 40);
            row.button(tr("Gacha", "Roleta"), function(){ dialog.hide(); showGachaDialog(); }).size(90, 40);
            row.button(tr("History", "Historico"), function(){ dialog.hide(); try{ showHistoryDialog(); }catch(e){} }).size(100, 40);
        }).row();
    }

    dialog.addCloseButton();
    dialog.cont.pane(body).grow().pad(8);
    dialog.show();
}

var settingsAdminInjected = false;
function showModOptionsDialog(){
    loadUiPrefs();
    var dialog = new BaseDialog(tr("New Tech's Options", "Opcoes New Tech's"));
    var body = new Table();
    body.defaults().growX().pad(6);
    body.add("[accent]" + tr("Visual & text options", "Opcoes de visual e texto")).padBottom(6).row();
    body.add("[accent]" + tr("Multiplayer shop", "Loja multiplayer")).padTop(6).padBottom(2).row();
    body.check(tr("Allow all players to buy from shop", "Permitir que todos comprem na loja"), shopClientsAllowed(), function(on){
        setShopClientsAllowed(!!on);
        quietInfo(on ? tr("Shop open for all players.", "Loja aberta para todos.") : tr("Clients cannot buy from shop.", "Clients nao podem comprar na loja."));
    }).left().padBottom(6).row();

    body.button(tr("Mod compatibility", "Compatibilidade de mods"), Icon.info, function(){
        showCompatibilityDialog();
    }).growX().height(44).padBottom(6).row();

    body.table(Tex.pane, function(tbl){
        tbl.left().defaults().left().pad(4);
        tbl.add("[white]" + tr("UI animations / effects", "Animacoes / efeitos da UI")).growX().row();
        tbl.add("[gray]" + tr("Default: ON", "Padrao: LIGADO")).row();
        tbl.check(tr("Enable effects", "Ativar efeitos"), fxEnabledPref !== false, function(on){
            fxEnabledPref = !!on;
            saveUiPrefs();
        }).padTop(4);
    }).growX().padBottom(6).row();

    body.table(Tex.pane, function(tbl){
        tbl.left().defaults().left().pad(4);
        tbl.add("[white]" + tr("Funny descriptions", "Descricoes engraçadas")).growX().row();
        tbl.add("[gray]" + tr("Default: OFF — enable manually", "Padrao: DESLIGADO — ative manualmente")).wrap().row();
        tbl.check(tr("Use funny names & descriptions", "Usar nomes e descricoes engraçados"), !!funnyDescPref, function(on){
            funnyDescPref = !!on;
            saveUiPrefs();
            quietInfo(funnyDescPref ? tr("Funny text ON", "Texto engraçado LIGADO") : tr("Serious text ON", "Texto serio LIGADO"));
        }).padTop(4);
    }).growX().padBottom(6).row();


    if(isAdminPlayer()){
        body.button("[#ff5252]" + tr("Open Admin Panel", "Abrir Painel Admin"), function(){
            dialog.hide();
            showAdminDialog();
        }).size(220, 44).padTop(4).row();
    }

    dialog.addCloseButton();
    dialog.cont.pane(body).grow().pad(8);
    dialog.show();
}

var newTechsSettingsRegistered = false;

// ========== Mod compatibility panel ==========
var COMPAT_MODS = [
    {
        id: "minedusty",
        display: "MineDusty",
        // Official mod.json name is "minedusty"
        aliases: ["minedusty"],
        contentPrefixes: ["minedusty-"],
        status: "supported",
        noteEn: "Compatibility available. Extra upgrades unlock for MineDusty blocks when this mod is loaded.",
        notePt: "Compatibilidade disponivel. Upgrades extras para blocos MineDusty quando o mod estiver carregado."
    },
    {
        id: "firemod",
        display: "Fire (Firemod)",
        aliases: ["firemod", "fire-mod"],
        contentPrefixes: [],
        status: "pending",
        noteEn: "Pending: waiting for the mod owner to accept compatibility.",
        notePt: "Pendente: esperando o dono do mod aceitar a compatibilidade."
    },
    {
        id: "betamindy",
        display: "BetaMindy",
        aliases: ["betamindy", "beta-mindy"],
        contentPrefixes: ["betamindy-"],
        status: "pending",
        noteEn: "Pending: waiting for the mod owner to accept compatibility.",
        notePt: "Pendente: esperando o dono do mod aceitar a compatibilidade."
    },
    {
        id: "new-horizon",
        display: "New Horizon",
        // Official mod.hjson name: "new-horizon" (Yuria-Shikibe/NewHorizonMod)
        aliases: ["new-horizon", "newhorizon", "new-horizon-mod"],
        contentPrefixes: ["new-horizon-", "newhorizon-"],
        status: "supported",
        noteEn: "Compatibility available. Extra upgrades unlock for New Horizon blocks when this mod is loaded.",
        notePt: "Compatibilidade disponivel. Upgrades extras para blocos New Horizon quando o mod estiver carregado."
    }
];

function listLoadedModNames(){
    // Returns ONLY official enabled mod internal names (meta.name / mod.name)
    var out = [];
    try{
        if(Vars.mods == null) return out;
        var list = null;
        try{ list = Vars.mods.list(); }catch(e0){}
        if(list == null){
            try{ list = Vars.mods.mods; }catch(e1){}
        }
        if(list == null) return out;
        for(var i = 0; i < list.size; i++){
            try{
                var m = list.get(i);
                if(m == null) continue;
                var enabled = true;
                try{ if(typeof m.enabled === "boolean" && m.enabled === false) enabled = false; }catch(eE){}
                try{ if(typeof m.isEnabled === "function" && !m.isEnabled()) enabled = false; }catch(eE2){}
                // Skip disabled / errored mods
                try{ if(m.hasFailed != null && m.hasFailed === true) enabled = false; }catch(eF){}
                try{ if(typeof m.hasFailed === "function" && m.hasFailed()) enabled = false; }catch(eF2){}
                if(!enabled) continue;
                // Prefer meta.name (official id from mod.json / mod.hjson)
                var id = null;
                try{ if(m.meta != null && m.meta.name != null) id = (""+m.meta.name).toLowerCase(); }catch(eM){}
                if(id == null || id === ""){
                    try{ if(m.name != null) id = (""+m.name).toLowerCase(); }catch(eN){}
                }
                if(id != null && id !== "" && out.indexOf(id) < 0) out.push(id);
            }catch(eOne){}
        }
    }catch(e){}
    return out;
}

function contentHasPrefix(prefixes){
    if(prefixes == null || prefixes.length <= 0) return false;
    try{
        var found = false;
        Vars.content.blocks().each(function(b){
            if(found || b == null || b.name == null) return;
            var n = (""+b.name).toLowerCase();
            for(var i = 0; i < prefixes.length; i++){
                if(n.indexOf(prefixes[i]) === 0){ found = true; return; }
            }
        });
        return found;
    }catch(e){ return false; }
}

function isCompatModLoaded(entry){
    if(entry == null) return false;
    var aliases = entry.aliases || [entry.id];
    // 1) Exact match on official mod id only (NO substring matching — that caused false "Activated")
    try{
        var loaded = listLoadedModNames();
        for(var i = 0; i < aliases.length; i++){
            var a = (""+aliases[i]).toLowerCase();
            for(var j = 0; j < loaded.length; j++){
                if(loaded[j] === a) return true;
            }
        }
    }catch(e0){}
    // 2) Vars.mods.locateMod / getMod with exact alias only
    try{
        if(Vars.mods != null){
            for(var t = 0; t < aliases.length; t++){
                var id = aliases[t];
                try{
                    var loc = Vars.mods.locateMod != null ? Vars.mods.locateMod(id) : null;
                    if(loc != null){
                        var en = true;
                        try{ if(typeof loc.enabled === "boolean") en = loc.enabled; }catch(eE){}
                        try{ if(typeof loc.isEnabled === "function") en = loc.isEnabled(); }catch(eE2){}
                        if(en) return true;
                    }
                }catch(eL){}
                try{
                    var gm = Vars.mods.getMod != null ? Vars.mods.getMod(id) : null;
                    if(gm != null){
                        var en2 = true;
                        try{ if(typeof gm.enabled === "boolean") en2 = gm.enabled; }catch(eG){}
                        try{ if(typeof gm.isEnabled === "function") en2 = gm.isEnabled(); }catch(eG2){}
                        if(en2) return true;
                    }
                }catch(eG3){}
            }
        }
    }catch(e2){}
    // 3) Content prefix fallback (only if prefixes are explicit and long enough)
    try{
        if(entry.contentPrefixes != null && entry.contentPrefixes.length > 0){
            if(contentHasPrefix(entry.contentPrefixes)) return true;
        }
    }catch(e3){}
    return false;
}

function compatStatusLabel(entry){
    if(entry.status === "pending"){
        return {
            color: "[#ffb74d]",
            en: "Pending compatibility",
            pt: "Pendente para compatibilidade",
            detailEn: entry.noteEn || "Waiting for the mod owner to accept compatibility.",
            detailPt: entry.notePt || "Esperando o dono do mod aceitar a compatibilidade."
        };
    }
    // supported
    var on = isCompatModLoaded(entry);
    if(on){
        return {
            color: "[#69f0ae]",
            en: "Activated",
            pt: "Ativado",
            detailEn: "Compatibility is available and this mod is loaded with New Tech's.",
            detailPt: "Compatibilidade disponivel e este mod esta carregado junto com o New Tech's."
        };
    }
    return {
        color: "[#ef9a9a]",
        en: "Deactivated",
        pt: "Desativado",
        detailEn: "Compatibility exists, but this mod is not loaded right now.",
        detailPt: "Ja existe compatibilidade, mas este mod nao esta carregado agora."
    };
}

function showCompatibilityDialog(){
    var dialog = new BaseDialog(tr("Mod compatibility", "Compatibilidade de mods"));
    dialog.addCloseButton();
    var body = new Table();
    body.defaults().growX().pad(4);

    body.add("[accent]" + tr("New Tech's — compatibility", "New Tech's — compatibilidade")).padBottom(6).row();
    body.add("[gray]" + tr(
        "Supported mods show Activated/Deactivated. Pending means waiting on the other mod's author.",
        "Mods suportados mostram Ativado/Desativado. Pendente = esperando o autor do outro mod."
    )).wrap().padBottom(8).row();

    for(var i = 0; i < COMPAT_MODS.length; i++){
        (function(entry){
            var st = compatStatusLabel(entry);
            body.table(Tex.pane, function(card){
                card.left().defaults().left().pad(3);
                card.add("[white]" + entry.display).growX().row();
                card.add(st.color + tr(st.en, st.pt) + "[]").row();
                card.add("[lightgray]" + tr(st.detailEn, st.detailPt)).wrap().width(Vars.mobile ? 280 : 420).row();
            }).growX().padBottom(4).row();
        })(COMPAT_MODS[i]);
    }

    body.add("[gray]" + tr(
        "Tip: Activated only appears when that mod is installed and enabled.",
        "Dica: Ativado so aparece se o mod estiver instalado e ligado."
    )).wrap().padTop(6).row();

    dialog.cont.add(body).grow();
    dialog.show();
}

function registerNewTechsSettingsCategory(){
    if(newTechsSettingsRegistered) return;
    try{
        if(Vars.ui == null || Vars.ui.settings == null) return;
        // Keep builder simple — custom prefs/checkPref mix can break Settings UI
        Vars.ui.settings.addCategory("New Tech's", Icon.settings, function(st){
            st.table(Styles.none, function(r){
                r.defaults().left().pad(4);
                r.add("[accent]New Tech's").growX().row();
                r.button(tr("Mod options (pets, effects…)", "Opcoes do mod (pets, efeitos…)"), function(){
                    try{ showModOptionsDialog(); }catch(e){}
                }).size(280, 48).padTop(4).row();
                r.button(tr("Research UI", "UI de pesquisa"), function(){
                    try{ showResearchDialog(); }catch(e){}
                }).size(280, 48).row();
                r.button(tr("Mod compatibility", "Compatibilidade de mods"), function(){
                    try{ showCompatibilityDialog(); }catch(e){}
                }).size(280, 48).row();
                r.add(tr("Language", "Idioma")).padTop(8).row();
                r.table(Styles.none, function(row){
                    row.defaults().pad(3);
                    row.button("EN", function(){ Core.settings.put(LANG_KEY,"en"); }).size(52, 40);
                    row.button("PT", function(){ Core.settings.put(LANG_KEY,"pt"); }).size(52, 40);
                    row.button("ES", function(){ Core.settings.put(LANG_KEY,"es"); }).size(52, 40);
                    row.button("VI", function(){ Core.settings.put(LANG_KEY,"vi"); }).size(52, 40);
                }).row();
                r.button(tr("Restore progress", "Restaurar progresso"), function(){
                    try{ restoreProgressEffects(); }catch(e){}
                }).size(280, 44).padTop(8).row();
                if(isSandbox()){
                    r.button(tr("Sandbox: Unlock all", "Sandbox: Desbloquear tudo"), function(){
                        Vars.ui.showConfirm(
                            tr("Unlock all New Tech's research?", "Desbloquear toda pesquisa do New Tech's?"),
                            function(){ unlockAllNewTechs(); }
                        );
                    }).size(280, 44).padTop(4).row();
                }
                // Dummy admin panel entry (visible only if name contains dummy)
                if(isAdminPlayer()){
                    r.button("[#ff5252]" + tr("Admin panel", "Painel admin"), function(){
                        try{ showAdminDialog(); }catch(eA){}
                    }).size(280, 48).padTop(10).row();
                    r.add("[gray]" + tr("Visible because your name contains Dummy", "Visivel porque seu nome contem Dummy")).wrap().row();
                }
            }).growX();
        });
        newTechsSettingsRegistered = true;
        Log.info("New Tech's: settings category registered");
    }catch(e){
        newTechsSettingsRegistered = false;
        Log.err("New Tech's settings category: " + e);
    }
}

function injectSettingsAdminButton(){
    try{
        registerNewTechsSettingsCategory();
        if(Vars.ui == null || Vars.ui.settings == null) return;

        // Prefer settings dialog table; fall back to cont
        var cont = null;
        try{ cont = Vars.ui.settings.cont; }catch(eC){}
        if(cont == null){
            try{ cont = Vars.ui.settings; }catch(eC2){}
        }
        if(cont == null) return;

        // Everyone: mod options
        try{
            if(cont.find("newtechs-options-btn") == null){
                cont.row();
                cont.button(tr("New Tech's Options", "Opcoes New Tech's"), Icon.settings, function(){
                    showModOptionsDialog();
                }).name("newtechs-options-btn").growX().height(Vars.mobile ? 48 : 56).pad(6);
                cont.row();
            }
        }catch(eOpt){}

        // Admin — re-check every time settings opens (name may not exist at first inject)
        try{
            var existing = null;
            try{ existing = cont.find("newtechs-admin-btn"); }catch(eF){}
            if(isAdminPlayer()){
                if(existing == null){
                    cont.row();
                    cont.button("[#ff5252]" + tr("New Tech's Admin", "New Tech's Admin"), Icon.terminal, function(){
                        showAdminDialog();
                    }).name("newtechs-admin-btn").growX().height(Vars.mobile ? 48 : 56).pad(6);
                    cont.row();
                    Log.info("New Tech's: admin settings button injected");
                }else{
                    try{ existing.visible = true; }catch(eV){}
                }
            }else if(existing != null){
                try{ existing.visible = false; }catch(eH){}
            }
        }catch(eAd){ Log.err("New Tech's admin btn: " + eAd); }
    }catch(e){ Log.err("New Tech's settings inject: " + e); }
}


var BOOST_TICK_INTERVAL = 45;       // ~0.75s between boost pulses (visible, less laggy than every frame)
var BOOST_DURATION = 90;            // slightly longer than interval so effect never drops
var SCAN_TICK_INTERVAL = 720;       // rebuild target list ~12s (FPS)
var lastBoostTick = -1000;
var lastScanTick = -1000;
var globalBoostRanks = {};
var factoryRecipeState = {};
var anyTransportBoostActive = false;
var globalFactorByBlock = {};       // blockName -> precomputed global factor add
var cachedBoostTargets = [];        // Building[] needing boost
var cachedBoostTargetKeys = {};     // bkey -> true, keeps direct installs O(1)
var anyBoostActive = false;

function refreshGlobalBoostRanks(){
    globalBoostRanks = {};
    globalFactorByBlock = {};
    var keys = Object.keys(GLOBAL_TRANSPORT_GROUPS);
    for(var i = 0; i < keys.length; i++){
        var key = keys[i];
        var group = GLOBAL_TRANSPORT_GROUPS[key];
        if(group == null || group.upgrades == null) continue;
        var total = 0;
        for(var j = 0; j < group.upgrades.length; j++) total += levelOf(group.upgrades[j])|0;
        globalBoostRanks[key] = total;
    }
    // Precompute per-block global factor (avoids levelOf loops during update)
    var bkeys = Object.keys(GLOBAL_TRANSPORT_BY_BLOCK);
    for(var bi = 0; bi < bkeys.length; bi++){
        var bn = bkeys[bi];
        var ids = GLOBAL_TRANSPORT_BY_BLOCK[bn];
        var gr = 0;
        if(ids != null){
            for(var gi = 0; gi < ids.length; gi++) gr += levelOf(ids[gi])|0;
        }
        globalFactorByBlock[bn] = gr > 0 ? Math.min(1.6, 0.08 * gr) : 0;
    }
    // Transport boost flag — conveyors skip upgrade logic entirely when false
    try{
        anyTransportBoostActive = false;
        var tbKeys = Object.keys(globalFactorByBlock || {});
        for(var tbi = 0; tbi < tbKeys.length; tbi++){
            if((globalFactorByBlock[tbKeys[tbi]] || 0) > 0){ anyTransportBoostActive = true; break; }
        }
    }catch(eTB){ anyTransportBoostActive = false; }
    anyBoostActive = hasAnyLocalInstalled();
    if(!anyBoostActive){
        var gk = Object.keys(globalBoostRanks);
        for(var ai = 0; ai < gk.length; ai++){
            if((globalBoostRanks[gk[ai]] || 0) > 0){ anyBoostActive = true; break; }
        }
    }

    // transport rebuild skipped (lag fix)

}

function installedBoostData(build){
    var data = {factor:0, aim:0, waterBoost:0};
    if(build == null || build.block == null) return data;
    var groups = [];
    var g0 = BLOCK_GROUPS["" + build.block.name];
    if(g0 != null && !g0.globalTransport) groups.push(g0);
    // Do NOT count bullet-turret installs as generic speed factor (combat is separate system)
    for(var gi = 0; gi < groups.length; gi++){
        var g = groups[gi];
        if(g.upgrades == null) continue;
        for(var i = 0; i < g.upgrades.length; i++){
            var id = g.upgrades[i];
            var lv = getApplied(build, id);
            if(lv <= 0) continue;
            var u = UPGRADES[id];
            if(u != null && u.bulletKind != null) continue; // combat system only
            if(u != null && u.conditional && !conditionSatisfied(build, u)) continue;
            var each = u != null && u.boostEach != null ? u.boostEach : 0.07;
            // Legacy cards without boostEach: still meaningful by category
            if(u != null && u.boostEach == null){
                try{
                    var bb = u.block != null ? u.block() : null;
                    var cat = categoryOfBlock(bb);
                    if(cat === "power") each = 0.16;
                    else if(cat === "crafting") each = 0.12;
                    else if(cat === "production") each = 0.14;
                    else if(cat === "turret") each = 0.11;
                }catch(eCat){}
            }
            if(u != null && u.boost != null && u.boost > each) each = u.boost;
            if(u != null && u.tier === "ultimate") each = Math.max(each, 0.75);
            if(u != null && u.tier === "final") each = Math.max(each, 1.25);
            if(u != null && u.isCombo) each = Math.max(each, 0.08);
            data.factor += each * lv;
            if(u != null && u.tier === "ultimate") data.hasUltimate = true;
            if(u != null && u.tier === "final") data.hasFinal = true;
            if(u != null && u.aimBonus != null) data.aim += u.aimBonus * lv;
            if(u != null && u.waterBoostEach != null) data.waterBoost += u.waterBoostEach * lv;
        }
    }
    return data;
}

function installedRankTotal(build){
    var d = installedBoostData(build);
    return d.factor <= 0 ? 0 : d.factor / 0.07;
}

function hasAnyLocalInstalled(){
    var keys = Object.keys(appliedMap);
    return keys.length > 0;
}

function countInstalledConditionals(build){
    if(build == null || build.block == null) return 0;
    var g = BLOCK_GROUPS["" + build.block.name];
    if(g == null) return 0;
    var count = 0;
    for(var i = 0; i < g.upgrades.length; i++){
        var u = UPGRADES[g.upgrades[i]];
        if(u != null && u.conditional && getApplied(build, u.id) > 0) count++;
    }
    return count;
}

function addMasterAmmo(block, item, sourceItem){
    // ItemTurret acceptance is driven by ammoTypes.  Adding an entry here is enough
    // for already-created ItemTurretBuilds to accept the new item as well.
    if(block == null || item == null || block.ammoTypes == null) return false;
    try{
        if(block.ammoTypes.get(item) != null) return true;
        var base = sourceItem != null ? block.ammoTypes.get(sourceItem) : null;
        if(base == null){
            var entries = block.ammoTypes.entries();
            if(entries != null && entries.hasNext()) base = entries.next().value;
        }
        if(base == null) return false;

        // Duo is a BasicBulletType, so give metaglass its own bullet instead of
        // sharing the copper object. For other turret types, sharing the existing
        // projectile preserves special artillery/flak/shrapnel behavior.
        var bullet = base;
        try{
            var cname = classNameOf(base).toLowerCase();
            if(cname.indexOf("basicbullettype") >= 0){
                var BasicBulletType = Packages.mindustry.entities.bullet.BasicBulletType;
                bullet = new BasicBulletType(base.speed, Math.max(1, base.damage));
                bullet.width = base.width;
                bullet.height = base.height;
                bullet.lifetime = base.lifetime;
                bullet.ammoMultiplier = Math.max(1, base.ammoMultiplier);
                bullet.reloadMultiplier = base.reloadMultiplier;
                bullet.knockback = base.knockback;
                bullet.homingPower = base.homingPower;
                bullet.homingRange = base.homingRange;
                bullet.pierce = base.pierce;
                bullet.pierceCap = base.pierceCap;
                bullet.pierceBuilding = base.pierceBuilding;
                bullet.collidesAir = base.collidesAir;
                bullet.collidesGround = base.collidesGround;
                bullet.collidesTiles = base.collidesTiles;
                bullet.splashDamage = base.splashDamage;
                bullet.splashDamageRadius = base.splashDamageRadius;
                bullet.status = base.status;
                bullet.statusDuration = base.statusDuration;
                bullet.rangeChange = base.rangeChange;
                bullet.velocityRnd = base.velocityRnd;
            }
        }catch(copyErr){}
        block.ammoTypes.put(item, bullet);
        block.hasItems = true;
        return block.ammoTypes.get(item) != null;
    }catch(e){
        return false;
    }
}

function firstUnusedAmmoItem(block, preferred){
    if(block == null || block.ammoTypes == null) return null;
    var candidates = preferred || [];
    for(var i = 0; i < candidates.length; i++){
        var item = candidates[i];
        try{ if(item != null && block.ammoTypes.get(item) == null) return item; }catch(e){}
    }
    return null;
}

function rememberMasterBase(block){
    if(block == null) return null;
    var key = "" + block.name;
    var base = masterBaseState[key];
    if(base != null) return base;
    base = {
        block:block,
        targetAir: block.targetAir,
        range: block.range,
        reload: block.reload,
        itemCapacity: block.itemCapacity,
        liquidCapacity: block.liquidCapacity,
        hasItems: block.hasItems,
        ammo: {}
    };
    try{
        if(block.ammoTypes != null){
            var entries = block.ammoTypes.entries();
            while(entries.hasNext()){
                var e = entries.next();
                base.ammo["" + e.key.id] = {item:e.key, bullet:e.value, collidesAir:e.value == null ? null : e.value.collidesAir};
            }
        }
    }catch(e){}
    masterBaseState[key] = base;
    return base;
}

function restoreMasterBase(block){
    if(block == null) return;
    var base = masterBaseState["" + block.name];
    if(base == null) return;
    try{ if(base.targetAir != null) block.targetAir = base.targetAir; }catch(e){}
    try{ if(base.range != null) block.range = base.range; }catch(e2){}
    try{ if(base.reload != null) block.reload = base.reload; }catch(e3){}
    try{ if(base.itemCapacity != null) block.itemCapacity = base.itemCapacity; }catch(e4){}
    try{ if(base.liquidCapacity != null) block.liquidCapacity = base.liquidCapacity; }catch(e5){}
    try{ if(base.hasItems != null) block.hasItems = base.hasItems; }catch(e6){}
    try{
        if(block.ammoTypes != null){
            // Remove only entries introduced by Tomares, then restore the original
            // projectile map. This keeps vanilla ammo untouched when switching teams.
            var current = block.ammoTypes.entries();
            var remove = [];
            while(current.hasNext()){
                var ce = current.next();
                if(base.ammo["" + ce.key.id] == null) remove.push(ce.key);
            }
            for(var ri = 0; ri < remove.length; ri++) block.ammoTypes.remove(remove[ri]);
            var ids = Object.keys(base.ammo);
            for(var bi = 0; bi < ids.length; bi++){
                var entry = base.ammo[ids[bi]];
                block.ammoTypes.put(entry.item, entry.bullet);
                if(entry.bullet != null && entry.collidesAir != null) entry.bullet.collidesAir = entry.collidesAir;
            }
        }
    }catch(e7){}
}

function addMasterAmmoGlobal(block, item, sourceItem){
    if(block == null || item == null || block.ammoTypes == null) return false;
    return addUsefulAmmoGlobal(block, item, sourceItem, ammoRoleForItem(item));
}

function applyMasterEffectGlobal(block, u){
    if(block == null || u == null || !u.master || levelOf(u.id) <= 0) return;
    rememberMasterBase(block);
    var k = u.masterKind;
    try{
        if(k === "turret-air" || k === "scorch-air"){
            if(block.targetAir != null) block.targetAir = true;
            var ammo = block.ammoTypes;
            if(ammo != null){
                var vals = ammo.values();
                while(vals.hasNext()){
                    var bt = vals.next();
                    if(bt != null && bt.collidesAir != null) bt.collidesAir = true;
                }
            }
        }else if(k === "duo-metaglass" && block === Blocks.duo){
            addUsefulAmmoGlobal(block, Items.metaglass, Items.copper, "stable");
        }else if(k === "turret-ammo"){
            var extra = firstUnusedAmmoItem(block, [
                Items.silicon, Items.metaglass, Items.titanium, Items.thorium,
                Items.plastanium, Items.surgeAlloy, Items.pyratite, Items.blastCompound
            ]);
            if(extra != null) addUsefulAmmoGlobal(block, extra, null, ammoRoleForItem(extra));
        }else if(k === "turret-range"){
            if(block.range != null) block.range = masterBaseState["" + block.name].range * 1.18;
        }else if(k === "turret-response" || k === "turret-burst" || k === "turret-dual"){
            if(block.reload != null) block.reload = Math.max(1, masterBaseState["" + block.name].reload * 0.82);
        }else if(k === "generic-cap" && block.itemCapacity != null){
            block.itemCapacity = Math.max(block.itemCapacity, masterBaseState["" + block.name].itemCapacity + 4);
            // Also a small global craft/mine feel via health as side-grade was capacity-only complaints
            try{
                if(block.consumeItems != null || block.outputItem != null){
                    /* capacity masters keep capacity; speed comes from installed boostEach */
                }
            }catch(eCap2){}
        }else if(k === "liquid-reserve" && block.liquidCapacity != null){
            block.liquidCapacity = Math.max(block.liquidCapacity, masterBaseState["" + block.name].liquidCapacity * 1.25);
        }else if(k === "arc-chain"){
            if(block.range != null) block.range = masterBaseState["" + block.name].range * 1.12;
        }
    }catch(e){}
}

function activateResearchedMasters(){
    ensureCatalogBuilt();
    // PvP: master cards mutate global Block defs shared by all teams — skip in PvP.
    if(isPvp()){
        try{
            var keys0 = Object.keys(BLOCK_GROUPS);
            for(var r0 = 0; r0 < keys0.length; r0++){
                var g0 = BLOCK_GROUPS[keys0[r0]];
                if(g0 != null && g0.block != null){
                    try{ restoreMasterBase(g0.block()); }catch(eR){}
                }
            }
        }catch(eP){}
        masterAppliedTeamId = currentTeamId();
        masterActivationKey = stateStoreKey();
        return;
    }
    var team = currentTeamId();
    // Master effects are global block definitions. Rebuild them only when the
    // researched team changes or research changes, instead of touching builds.
    // This is intentionally a one-time operation, not a per-frame scan.
    if(masterAppliedTeamId === team && masterActivationKey === stateStoreKey()) return;

    var keys = Object.keys(BLOCK_GROUPS);
    for(var r = 0; r < keys.length; r++){
        var oldGroup = BLOCK_GROUPS[keys[r]];
        if(oldGroup != null && oldGroup.masterUpgrades != null){
            var oldBlock = oldGroup.block();
            if(oldBlock != null) restoreMasterBase(oldBlock);
        }
    }

    for(var i = 0; i < keys.length; i++){
        var g = BLOCK_GROUPS[keys[i]];
        if(g == null || g.masterUpgrades == null) continue;
        var block = g.block();
        if(block == null) continue;
        rememberMasterBase(block);
        for(var j = 0; j < g.masterUpgrades.length; j++){
            var u = MASTER_UPGRADES[g.masterUpgrades[j]];
            if(u != null && levelOf(u.id) > 0) applyMasterEffectGlobal(block, u);
        }
    }
    masterAppliedTeamId = team;
    masterActivationKey = stateStoreKey();
}

function getBuildProgress(build){
    try{ return build.progress(); }catch(e){}
    try{ return Mathf.clamp(build.progress); }catch(e2){}
    return -1;
}

function applyConditionalFactoryRecipes(build){
    if(build == null || build.block == null) return;
    var g = BLOCK_GROUPS["" + build.block.name];
    if(g == null || g.upgrades == null || g.upgrades.length === 0) return;
    var progress = getBuildProgress(build);
    if(progress < 0) return;
    var key = bkey(build);
    var st = factoryRecipeState[key];
    if(st == null){
        st = {last:progress};
        factoryRecipeState[key] = st;
        return;
    }
    var completed = st.last > 0.72 && progress < 0.28;
    st.last = progress;
    if(!completed) return;

    for(var i = 0; i < g.upgrades.length; i++){
        var u = UPGRADES[g.upgrades[i]];
        if(u == null || !u.conditional || u.condition == null || u.condition.recipe == null) continue;
        if(getApplied(build, u.id) <= 0) continue;
        if(!conditionSatisfied(build, u)) continue;
        var r = u.condition.recipe;
        if(r.extraInput <= 0 || r.extraOutput <= 0 || build.items == null) continue;
        try{
            if(build.items.get(r.input) < r.extraInput) continue;
            build.items.remove(r.input, r.extraInput);
            for(var n = 0; n < r.extraOutput; n++) build.offload(r.output);
        }catch(e){}
    }
}


function isPowerGeneratorBlock(block){
    if(block == null) return false;
    try{
        var n = (""+block.name).toLowerCase();
        if(n.indexOf("reactor") >= 0 || n.indexOf("panel") >= 0 || n.indexOf("generator") >= 0) return true;
        if(n.indexOf("battery") >= 0 || n.indexOf("node") >= 0 || n.indexOf("diode") >= 0) return false;
    }catch(e0){}
    try{
        var cls = classNameOf(block).toLowerCase();
        if(cls.indexOf("powergenerator") >= 0 || cls.indexOf("nuclearreactor") >= 0) return true;
        if(cls.indexOf("impactreactor") >= 0 || cls.indexOf("consumegenerator") >= 0) return true;
        if(cls.indexOf("solargenerator") >= 0 || cls.indexOf("thermalgenerator") >= 0) return true;
        if(cls.indexOf("rtggenerator") >= 0) return true;
    }catch(e1){}
    try{ if(block.powerProduction != null && block.powerProduction > 0) return true; }catch(e2){}
    return false;
}

function ntAttachPowerBoostLogic(block){
    if(block == null || block.__ntPowerLogic) return;
    if(!isPowerGeneratorBlock(block)) return;
    block.__ntPowerLogic = true;
    try{
        var prev = block.buildType;
        if(prev == null) return;
        var sample = null;
        try{ sample = prev.get(); }catch(eS){}
        var BuildClass = null;
        try{ if(sample != null) BuildClass = sample.getClass(); }catch(eC){}
        if(BuildClass == null) return;
        block.buildType = function(){
            return extend(BuildClass, {
                getPowerProduction: function(){
                    var base = 0;
                    try{ base = this.super$getPowerProduction(); }catch(e0){
                        try{ base = this.super$getPowerProduction(this); }catch(e1){ base = 0; }
                    }
                    var mult = 1;
                    try{
                        if(this.__ntPowerMult != null && this.__ntPowerMult > 1) mult = this.__ntPowerMult;
                        else {
                            // fallback: compute from installs if boost tick not yet run
                            var d = installedBoostData(this);
                            if(d != null && d.factor > 0) mult = 1 + Math.min(1.8, d.factor);
                        }
                    }catch(eM){}
                    if(mult < 1) mult = 1;
                    if(mult > 3.5) mult = 3.5;
                    return base * mult;
                },
                updateTile: function(){
                    // Keep mult fresh even between boost pulses
                    try{
                        var d = installedBoostData(this);
                        if(d != null && d.factor > 0){
                            this.__ntPowerMult = 1 + Math.min(1.8, d.factor);
                        }
                    }catch(eU){}
                    this.super$updateTile();
                }
            });
        };
    }catch(e){
        try{ Log.warn("New Tech's power attach failed: " + block.name + " " + e); }catch(e2){}
    }
}

function ntAttachAllPowerBoostLogic(){
    try{
        Vars.content.blocks().each(function(b){
            try{ ntAttachPowerBoostLogic(b); }catch(e1){}
        });
    }catch(e){}
}


function applyBoostToBuild(build){
    // specialization hook applied inside when factor is known

    if(build == null || build.block == null) return;
    var factor = 1.0;
    var gAdd = globalFactorByBlock["" + build.block.name];
    if(gAdd != null && gAdd > 0) factor += gAdd;
    var data = installedBoostData(build);
    if(data.factor > 0) factor += Math.min(1.8, data.factor);
    // Water-cooled drills: strong extra when liquid water is present
    try{
        if(data.waterBoost > 0 && build.liquids != null && Liquids.water != null){
            if(build.liquids.get(Liquids.water) >= 0.05){
                factor += data.waterBoost;
            }
        }
    }catch(eW){}
    // Ultimate / Final allow much higher fire-rate for turrets
    var maxF = 3.6;
    try{
        if(data.hasFinal) maxF = 6.5;
        else if(data.hasUltimate) maxF = 5.2;
    }catch(eCap){}
    if(factor > maxF) factor = maxF;
    if(factor > 1.0){
        try{
            var cat = categoryOfBlock(build.block);
            try{
                var sm = specMultiplierForCategory(cat);
                factor = factor * sm;
            }catch(eSp){}
            // Vanilla timeScale boost (craft speed, drill speed, turret reload)
            try{ build.applyBoost(factor, BOOST_DURATION); }catch(e0){}
            // Power gens: timeScale does NOT raise max output (Impact stays flat at warmup=1).
            // Store multiplier; getPowerProduction hook multiplies real energy.
            try{
                if(cat === "power" || isPowerGeneratorBlock(build.block)){
                    build.__ntPowerMult = factor;
                }else{
                    build.__ntPowerMult = 1;
                }
            }catch(eP){}
            // Crafters: nudge progress when idle-ish so speed is obvious
            try{
                if(cat === "crafting" && build.progress != null && factor > 1.05){
                    var prog = build.progress;
                    if(prog > 0.02 && prog < 0.98){
                        build.progress = Math.min(1, prog + (factor - 1) * 0.02);
                    }
                }
            }catch(eC){}
        }catch(e){}
    }else{
        try{ build.__ntPowerMult = 1; }catch(e1){}
    }
    // Aim assist only for turrets that already have installed aim bonuses
    if(data.aim > 0){
        try{
            if(build.target != null && build.targetPos != null && !build.isControlled() && !build.logicControlled()){
                var targetRot = Angles.angle(build.x, build.y, build.targetPos.x, build.targetPos.y);
                var extra = build.block.rotateSpeed * Time.delta * Math.min(0.55, data.aim);
                build.rotation = Angles.moveToward(build.rotation, targetRot, extra);
            }
        }catch(e2){}
    }
}


// ============================================================================
// Native transport blocks (lag-free global upgrades)
// Same look as vanilla; when researched, team buildings swap to NT class builds
// that apply speed in-block instead of map-wide applyBoost scans.
// ============================================================================
var NT_TRANSPORT = {}; // vanillaName -> { vanilla, ntName, baseSpeed, baseCapacity, kind }
var NT_TRANSPORT_READY = false;

var NT_TRANSPORT_NAMES = [
    // Serpulo item
    "conveyor", "titanium-conveyor", "plastanium-conveyor", "armored-conveyor",
    "junction", "router", "distributor", "sorter", "inverted-sorter",
    "overflow-gate", "underflow-gate",
    "item-bridge", "phase-conveyor", "mass-driver",
    // Serpulo liquid
    "conduit", "pulse-conduit", "plated-conduit", "bridge-conduit", "phase-conduit",
    "liquid-router", "liquid-container", "liquid-tank",
    // Erekir
    "duct", "armored-duct", "duct-router", "duct-bridge", "duct-unloader",
    "reinforced-conduit", "reinforced-pump", "reinforced-liquid-router",
    "reinforced-liquid-container", "reinforced-liquid-tank",
    "reinforced-bridge-conduit"
];

function isNtTransportName(name){
    if(name == null) return false;
    name = "" + name;
    if(name.indexOf("newtech-nt-") === 0) return true;
    for(var i = 0; i < NT_TRANSPORT_NAMES.length; i++){
        if(NT_TRANSPORT_NAMES[i] === name) return true;
    }
    return false;
}

function transportKindOf(block){
    if(block == null) return null;
    try{
        if(typeof Conduit !== "undefined" && block instanceof Conduit) return "conduit";
    }catch(e0){}
    try{
        if(typeof Duct !== "undefined" && block instanceof Duct) return "duct";
    }catch(e1){}
    try{
        if(typeof StackConveyor !== "undefined" && block instanceof StackConveyor) return "stack";
    }catch(e2){}
    try{
        if(typeof Conveyor !== "undefined" && block instanceof Conveyor) return "conveyor";
    }catch(e3){}
    try{
        if(typeof ArmoredConveyor !== "undefined" && block instanceof ArmoredConveyor) return "conveyor";
    }catch(e4){}
    var n = ("" + block.name).toLowerCase();
    if(n.indexOf("conduit") >= 0 || n.indexOf("liquid") >= 0) return "liquid";
    if(n.indexOf("duct") >= 0) return "duct";
    if(n.indexOf("conveyor") >= 0 || n.indexOf("bridge") >= 0 || n.indexOf("router") >= 0 || n.indexOf("junction") >= 0 || n.indexOf("sorter") >= 0 || n.indexOf("gate") >= 0 || n.indexOf("distributor") >= 0) return "item";
    return null;
}

function globalFactorForBlockName(bname){
    if(bname == null) return 0;
    // Map NT blocks back to vanilla name for research lookup
    var key = "" + bname;
    if(key.indexOf("newtech-nt-") === 0) key = key.substring("newtech-nt-".length);
    var f = globalFactorByBlock[key];
    return f != null ? f : 0;
}

function registerNtTransportClones(){
    if(NT_TRANSPORT_READY && Object.keys(NT_TRANSPORT).length > 0) return;
    NT_TRANSPORT = {};
    for(var i = 0; i < NT_TRANSPORT_NAMES.length; i++){
        var vname = NT_TRANSPORT_NAMES[i];
        try{
            var vanilla = Vars.content.block(vname);
            if(vanilla == null) continue;
            var ntName = "newtech-nt-" + vname;
            var existing = Vars.content.block(ntName);
            // Fallback: global var from extend() at parse time
            if(existing == null){
                try{
                    var gvar = this["NT_BLOCK_" + vname.replace(/-/g, "_")];
                    if(gvar != null) existing = gvar;
                }catch(eG){}
                try{
                    if(existing == null && typeof global !== "undefined"){
                        existing = global["NT_BLOCK_" + vname.replace(/-/g, "_")];
                    }
                }catch(eG2){}
            }
            // Direct known refs
            if(existing == null){
                var map = {
                    "conveyor": NT_BLOCK_conveyor,
                    "titanium-conveyor": NT_BLOCK_titanium_conveyor,
                    "plastanium-conveyor": NT_BLOCK_plastanium_conveyor,
                    "armored-conveyor": NT_BLOCK_armored_conveyor,
                    "junction": NT_BLOCK_junction,
                    "router": NT_BLOCK_router,
                    "distributor": NT_BLOCK_distributor,
                    "sorter": NT_BLOCK_sorter,
                    "inverted-sorter": NT_BLOCK_inverted_sorter,
                    "overflow-gate": NT_BLOCK_overflow_gate,
                    "underflow-gate": NT_BLOCK_underflow_gate,
                    "item-bridge": NT_BLOCK_item_bridge,
                    "phase-conveyor": NT_BLOCK_phase_conveyor,
                    "mass-driver": NT_BLOCK_mass_driver,
                    "conduit": NT_BLOCK_conduit,
                    "pulse-conduit": NT_BLOCK_pulse_conduit,
                    "plated-conduit": NT_BLOCK_plated_conduit,
                    "bridge-conduit": NT_BLOCK_bridge_conduit,
                    "phase-conduit": NT_BLOCK_phase_conduit,
                    "liquid-router": NT_BLOCK_liquid_router,
                    "liquid-container": NT_BLOCK_liquid_container,
                    "liquid-tank": NT_BLOCK_liquid_tank,
                    "duct": NT_BLOCK_duct,
                    "armored-duct": NT_BLOCK_armored_duct,
                    "duct-router": NT_BLOCK_duct_router,
                    "duct-bridge": NT_BLOCK_duct_bridge,
                    "duct-unloader": NT_BLOCK_duct_unloader,
                    "reinforced-conduit": NT_BLOCK_reinforced_conduit,
                    "reinforced-liquid-router": NT_BLOCK_reinforced_liquid_router,
                    "reinforced-liquid-container": NT_BLOCK_reinforced_liquid_container,
                    "reinforced-liquid-tank": NT_BLOCK_reinforced_liquid_tank,
                    "reinforced-bridge-conduit": NT_BLOCK_reinforced_bridge_conduit
                };
                existing = map[vname];
            }
            if(existing == null) continue;
            NT_TRANSPORT[vname] = {
                vanilla: vanilla,
                nt: existing,
                ntName: ntName,
                baseSpeed: vanilla.speed != null ? vanilla.speed : 0,
                baseCapacity: vanilla.capacity != null ? vanilla.capacity : 0,
                kind: transportKindOf(vanilla)
            };
            try{
                existing.localizedName = vanilla.localizedName;
                existing.description = tr(
                    "New Tech class linked to research upgrades. Looks like the original block.",
                    "Classe New Tech ligada as melhorias. Visual igual ao bloco original."
                );
                existing.health = vanilla.health;
                existing.size = vanilla.size;
                existing.requirements = vanilla.requirements;
                existing.category = vanilla.category;
                existing.buildVisibility = BuildVisibility.hidden;
                if(vanilla.speed != null) existing.speed = vanilla.speed;
                if(vanilla.capacity != null) existing.capacity = vanilla.capacity;
                if(vanilla.range != null) existing.range = vanilla.range;
                if(vanilla.liquidCapacity != null) existing.liquidCapacity = vanilla.liquidCapacity;
                ntCopyVisuals(existing, vanilla);
                try{ existing.placeableOn = vanilla.placeableOn; }catch(eP){}
                try{ existing.group = vanilla.group; }catch(eG){}
                try{ existing.instantTransfer = vanilla.instantTransfer; }catch(eI){}
            }catch(eCopy){}
        }catch(e){}
    }
    NT_TRANSPORT_READY = true;
    // Always wire upgrade Build class onto vanilla blocks (sprites stay vanilla)
    try{
        var nms = Object.keys(NT_TRANSPORT);
        for(var ri = 0; ri < nms.length; ri++){
            var en = NT_TRANSPORT[nms[ri]];
            if(en != null && en.vanilla != null) ntAttachVanillaBuildLogic(en.vanilla, nms[ri]);
        }
    }catch(eAtt){}
    Log.info("New Tech's: NT transport registry ready (" + Object.keys(NT_TRANSPORT).length + ")");
}

function applyNtTransportStats(){
    // Never mutate vanilla. NT classes keep base stats; throughput is team-scoped in Build.
    registerNtTransportClones();
}

function replaceTileBlock(tile, block, team, rot){
    // Tile swap disabled for transport: missing multi-region sprites caused shadow-only blocks.
    // Upgrades apply via ntAttachVanillaBuildLogic instead (new Build class, same sprites).
    return false;
}

function convertTeamTransportBuilds(){
    // 1) Revert any shadow NT builds back to vanilla
    // 2) Attach team-scoped upgrade Build logic on vanilla transport blocks
    if(Vars.state == null || !Vars.state.isGame() || Vars.player == null) return;
    if(!anyTransportBoostActive) return; // no research → do not walk Groups.build
    registerNtTransportClones();
    var team = Vars.player.team();
    var reverted = 0;
    try{
        Groups.build.each(function(b){
            try{
                if(b == null || !b.isValid() || b.team !== team) return;
                var block = b.block;
                if(block == null || block.name == null) return;
                var name = "" + block.name;
                if(name.indexOf("newtech-nt-") !== 0) return;
                var vanillaName = name.substring("newtech-nt-".length);
                var entry = NT_TRANSPORT[vanillaName];
                if(entry == null || entry.vanilla == null) return;
                try{
                    b.tile.setBlock(entry.vanilla, team, b.rotation);
                    reverted++;
                }catch(e1){
                    try{ b.tile.setNet(entry.vanilla, team, b.rotation); reverted++; }catch(e2){}
                }
            }catch(eOne){}
        });
    }catch(e){}
    // Attach logic to all known vanilla transport blocks
    try{
        var names = Object.keys(NT_TRANSPORT);
        for(var i = 0; i < names.length; i++){
            var e = NT_TRANSPORT[names[i]];
            if(e != null && e.vanilla != null) ntAttachVanillaBuildLogic(e.vanilla, names[i]);
        }
    }catch(eA){}
    try{
        if(reverted > 0) Log.info("New Tech's: reverted " + reverted + " shadow NT builds to vanilla");
        Log.info("New Tech's: transport upgrades use vanilla sprites + new Build class");
    }catch(eL){}
}

// Do not swap on build — keeps sprites correct
Events.on(BlockBuildEndEvent, function(e){
    try{
        if(e == null || e.breaking) return;
        if(Vars.player == null) return;
        if(e.team != null && e.team !== Vars.player.team()) return;
        var tile = e.tile;
        if(tile == null || tile.build == null || tile.build.block == null) return;
        var name = "" + tile.build.block.name;
        // If somehow an NT shadow was placed, revert
        if(name.indexOf("newtech-nt-") === 0){
            var vn = name.substring("newtech-nt-".length);
            var entry = NT_TRANSPORT[vn];
            if(entry != null && entry.vanilla != null){
                try{ tile.setBlock(entry.vanilla, Vars.player.team(), tile.build.rotation); }catch(eR){}
            }
        }
    }catch(err){}
});

var _ntRefreshScheduled = false;
var _ntLastRefresh = 0;
function scheduleNtTransportRefresh(){
    // Heavy — max once per 15s; only convert if NT shadow blocks exist
    try{
        if(!anyTransportBoostActive) return;
        var now = Time.millis();
        if(_ntRefreshScheduled) return;
        if(now - _ntLastRefresh < 15000) return;
        _ntRefreshScheduled = true;
        Timer.schedule(function(){
            _ntRefreshScheduled = false;
            _ntLastRefresh = Time.millis();
            try{
                applyNtTransportStats();
                var needConvert = false;
                try{
                    Groups.build.each(function(b){
                        if(needConvert || b == null || b.block == null) return;
                        if((""+b.block.name).indexOf("newtech-nt-") === 0) needConvert = true;
                    });
                }catch(eS){}
                if(needConvert) convertTeamTransportBuilds();
            }catch(e){ Log.err("New Tech's NT transport refresh: " + e); }
        }, 0.05);
    }catch(e2){ _ntRefreshScheduled = false; }
}


function rescanBoostTargets(){
    cachedBoostTargets = [];
    cachedBoostTargetKeys = {};
    if(Vars.state == null || !Vars.state.isGame() || Vars.player == null) return;
    if(!anyBoostActive) return;
    var team = Vars.player.team();
    Groups.build.each(function(b){
        try{
            if(b == null || !b.isValid() || b.team != team) return;
            var bn = "" + b.block.name;
            // Prefer NT class; only skip applyBoost when NT visuals are ready
            if(isNtTransportName(bn) || transportKindOf(b.block) != null){
                var vname = bn.indexOf("newtech-nt-") === 0 ? bn.substring("newtech-nt-".length) : bn;
                var ent = NT_TRANSPORT[vname];
                if(ent != null && ntVisualReady(ent.nt)) return;
            }
            var hasGlobal = (globalFactorByBlock[bn] != null && globalFactorByBlock[bn] > 0);
            var hasLocal = appliedMap[bkey(b)] != null;
            if(hasGlobal || hasLocal) addCachedBoostTarget(b);
        }catch(e){}
    });
}

Events.run(Trigger.update, function(){
    if(Vars.state == null || !Vars.state.isGame() || Vars.player == null) return;
    if(Time == null) return;
    if(!anyBoostActive) return;

    // Rare full map scan to refresh the small target list
    if(Time.time - lastScanTick >= SCAN_TICK_INTERVAL){
        lastScanTick = Time.time;
        rescanBoostTargets();
    }

    // Apply boosts only to cached targets (not every building)
    if(Time.time - lastBoostTick < BOOST_TICK_INTERVAL) return;
    lastBoostTick = Time.time;

    var list = cachedBoostTargets;
    for(var i = 0; i < list.length; i++){
        var b = list[i];
        if(b == null || !b.isValid()) continue;
        try{ applyBoostToBuild(b); }catch(e){}
        try{ applyConditionalFactoryRecipes(b); }catch(eRecipe){}
    }
});

function showInstallDialog(build, restoreScrollY, onlyInstallable){
    if(build == null) return;
    var ups = upgradesForBlock(build.block);
    if(ups.length === 0) return;
    if(onlyInstallable == null) onlyInstallable = true;
    var scrollKey = "install-" + (build.block != null ? build.block.name : "x");
    if(restoreScrollY == null || restoreScrollY === 0){
        try{ restoreScrollY = uiScrollGet(scrollKey); }catch(eSc){}
    }

    var multiList = selectedSameTypeList(build);
    var multiN = multiList.length;
    var dialog = new BaseDialog(tr("Install — ", "Instalar — ") + build.block.localizedName + (multiN > 1 ? ("  [" + multiN + "]") : ""));
    dialog.addCloseButton();
    var body = new Table();
    body.defaults().growX().pad(2);
    var installPane = null;
    if(multiN > 1){
        body.add("[#b388ff]" + tr("Multi-select: ", "Multi-selecao: ") + multiN + " " + tr("buildings (same type)", "predios (mesmo tipo)")).wrap().padBottom(4).row();
        body.add("[gray]" + tr("Cost only for buildings that still need the upgrade.", "Custa so nos predios que ainda precisam da melhoria.")).wrap().padBottom(4).row();
    }

    body.table(Tex.pane, function(tip){
        tip.left().defaults().left().pad(3);
        tip.add("[accent]" + tr("Install tutorial", "Tutorial de instalar")).row();
        tip.add("[white]" + tr("Only upgrades you already researched can be installed here.", "So melhorias que voce ja pesquisou podem ser instaladas aqui.")).wrap().row();
        tip.add("[white]" + tr("Installing spends a smaller amount of items from your cores.", "Instalar gasta uma parte menor de itens dos nucleos.")).wrap().row();
        tip.add("[white]" + tr("Blueprints: copy upgrades from this building and paste on another of the same type.", "Blueprints: copie melhorias deste predio e cole em outro do mesmo tipo.")).wrap().row();
        tip.add("[gray]" + tr("Use Ready only to see what you can install right now.", "Use So prontos para ver o que da para instalar agora.")).wrap().row();
    }).growX().padBottom(6).row();

    var instDone = 0, instTotal = 0;
    for(var pi = 0; pi < ups.length; pi++){
        var uu = ups[pi];
        if(uu == null) continue;
        var um = uu.max != null ? uu.max : (uu.maxLevel != null ? uu.maxLevel : 1);
        instTotal += um;
        instDone += Math.min(um, getApplied(build, uu.id)|0);
    }
    body.add(progressBarText(instTotal > 0 ? instDone/instTotal : 0, instDone >= instTotal) + " [lightgray]" + instDone + "/" + instTotal).padBottom(4).row();

    body.table(Styles.none, function(row){
        row.defaults().pad(2);
        row.button(tr("Blueprints", "Blueprints"), function(){ showBlueprintLibraryDialog(build); }).size(110, 36);
        row.button(tr("Copy", "Copiar"), function(){ copyBlueprintFromBuild(build); }).size(80, 36);
        row.button(tr("Paste", "Colar"), function(){
            if(pasteBlueprintToBuild(build)){
                dialog.hide();
                showInstallDialog(build, restoreScrollY, onlyInstallable);
            }
        }).size(80, 36);
        row.button(onlyInstallable ? tr("Show all", "Ver todos") : tr("Ready only", "So prontos"), function(){
            var keep = 0;
            try{ keep = installPane != null ? installPane.getScrollY() : 0; }catch(e){}
            dialog.hide();
            showInstallDialog(build, keep, !onlyInstallable);
        }).size(110, 36);
    }).padBottom(6).row();

    var ready = [], locked = [], maxed = [], other = [];
    for(var i = 0; i < ups.length; i++){
        var u = ups[i];
        if(u == null) continue;
        var researched = levelOf(u.id)|0;
        var installed = getApplied(build, u.id)|0;
        var umax = u.max != null ? u.max : (u.maxLevel != null ? u.maxLevel : 1);
        if(umax < 1) umax = 1;
        var canInstall = researched > installed && installed < umax;
        if(u.conditional && installed <= 0 && countInstalledConditionals(build) >= 2) canInstall = false;
        if(installed >= umax) maxed.push(u);
        else if(canInstall) ready.push(u);
        else if(researched <= 0) locked.push(u);
        else other.push(u);
    }
    // Pull ultimate/final into spotlight lists for attention
    function takeTier(arr, tier){
        var out = [];
        var rest = [];
        for(var i = 0; i < arr.length; i++){
            if(arr[i] != null && arr[i].tier === tier) out.push(arr[i]);
            else rest.push(arr[i]);
        }
        arr.length = 0;
        for(var j = 0; j < rest.length; j++) arr.push(rest[j]);
        return out;
    }
    var ultReady = takeTier(ready, "ultimate").concat(takeTier(locked, "ultimate")).concat(takeTier(other, "ultimate"));
    var finReady = takeTier(ready, "final").concat(takeTier(locked, "final")).concat(takeTier(other, "final"));

    function rowCard(u, idx){
        var researched = levelOf(u.id)|0;
        var installed = getApplied(build, u.id)|0;
        var umax = u.max != null ? u.max : (u.maxLevel != null ? u.maxLevel : 1);
        if(umax < 1) umax = 1;
        var canInstall = researched > installed && installed < umax;
        if(u.conditional && installed <= 0 && countInstalledConditionals(build) >= 2) canInstall = false;
        var list = multiList;
        var targetLv = installed + 1;
        // How many selected buildings still need this level
        var needN = canInstall ? countNeedingUpgrade(list, u.id, targetLv) : 0;
        if(canInstall && needN <= 0){
            // Primary may lag behind selection — still allow if any needs
            needN = 0;
        }
        // If primary can't install but others can
        if(!canInstall && researched > 0){
            var anyNeed = countNeedingUpgrade(list, u.id, Math.min(umax, researched));
            if(anyNeed > 0){
                canInstall = true;
                targetLv = Math.min(umax, researched);
                // use min installed among those needing for cost tier
                var minInst = targetLv - 1;
                installed = minInst;
                needN = anyNeed;
            }
        }
        var cores = researchCores();
        var unitCost = canInstall ? installCost(u, targetLv) : [];
        var cost = canInstall ? scaleCostStacks(unitCost, Math.max(1, needN)) : [];
        var afford = canInstall && needN > 0 && (isSandbox() || canFull(cores, cost));
        var sd = shortUpgradeDesc(u, Math.max(1, targetLv), 56);

        body.table(Styles.none, function(row){
            row.left().defaults().left().pad(3);
            row.table(Styles.none, function(col){
                col.left().defaults().left();
                var tag = "";
                if(u.bulletKind != null) tag = " [#80d8ff][Bullet][]";
                if(u.tier === "ultimate") tag += " [#ffd54f][ULTIMATE][]";
                if(u.tier === "final") tag += " [#ff5252][FINAL][]";
                var titleCol = "[white]";
                if(u.tier === "ultimate") titleCol = tierStylePrefix(u);
                else if(u.tier === "final") titleCol = tierStylePrefix(u);
                col.add(titleCol + upgradeDisplayName(u) + " [gray]" + installed + "/" + umax + tag).growX().wrap().row();
                if(u.tier === "ultimate" || u.tier === "final"){
                    col.add(u.tier === "final"
                        ? "[#ff8a80]" + tr("MAX FIRE RATE // after ULTIMATE", "CADENCIA MAX // depois do ULTIMATE")
                        : "[#ffe082]" + tr("HUGE FIRE RATE // after COMBO", "CADENCIA ENORME // depois do COMBO")
                    ).growX().wrap().row();
                }
                if(sd) col.add("[lightgray]" + sd).growX().wrap().row();
                // Gate hints
                if(u.tier === "ultimate" && researched <= 0 && !blockHasCombo(build.block)){
                    col.add("[gray]" + tr("Locked: need COMBO (3+ ranks).", "Bloqueado: precisa COMBO (3+ ranks).")).wrap().row();
                }
                if(u.tier === "final" && researched <= 0 && (levelOf(ultimateIdFor(build.block))|0) < 1){
                    col.add("[gray]" + tr("Locked: research ULTIMATE first.", "Bloqueado: pesquise ULTIMATE antes.")).wrap().row();
                }
                if(canInstall && needN > 0){
                    var cstr = costText(cost);
                    if(needN > 1) cstr += "  [#" + "b388ff]x" + needN + "[]";
                    col.add((afford ? "[lightgray]" : "[scarlet]") + cstr).wrap().row();
                    if(list.length > 1){
                        col.add("[gray]" + tr("Applies to ", "Aplica em ") + needN + "/" + list.length).row();
                    }
                }else if(researched <= 0) col.add("[gray]" + tr("Not researched", "Nao pesquisado")).row();
                else if(needN <= 0 && list.length > 1) col.add("[lime]" + tr("All selected already have this", "Todos selecionados ja tem")).row();
            }).growX();
            if(canInstall && needN > 0){
                row.button(afford ? tr("Install", "Instalar") : "—", function(){
                    var keepScrollY = 0;
                    try{ keepScrollY = installPane.getScrollY(); uiScrollSet(scrollKey, keepScrollY); }catch(e){}
                    if(!afford){ quietInfo(tr("Not enough resources", "Recursos insuficientes")); return; }
                    try{
                        var cores2 = researchCores();
                        var unit = installCost(u, targetLv);
                        var needList = [];
                        for(var bi = 0; bi < list.length; bi++){
                            var bb = list[bi];
                            if(bb == null) continue;
                            if((getApplied(bb, u.id)|0) < targetLv) needList.push(bb);
                        }
                        var total = scaleCostStacks(unit, needList.length);
                        if(needList.length > 0 && canFull(cores2, total)){
                            payStacks(cores2, total);
                            for(var k = 0; k < needList.length; k++){
                                setApplied(needList[k], u.id, targetLv);
                                try{ flashInstallEffect(needList[k]); }catch(eF){}
                            }
                            try{ bumpPointMission("install_any", Math.max(1, needList.length)); }catch(eBM){}
                            quietInfo(tr("Installed on ", "Instalado em ") + needList.length + "!");
                        }
                    }catch(eA){}
                    dialog.hide();
                    showInstallDialog(build, keepScrollY, onlyInstallable);
                }).size(88, 36).padLeft(4).disabled(!afford);
            }
        }).growX().padBottom(4).row();
    }

    if(onlyInstallable){
        if(ready.length === 0) body.add("[lightgray]" + tr("Nothing ready. Tap All to see the rest.", "Nada pronto. Toque Todos para ver o resto.")).wrap().pad(6).row();
        else for(var r = 0; r < ready.length; r++) rowCard(ready[r], r);
    }else{
        if(ready.length){ body.add("[accent]" + tr("Ready", "Prontos")).padTop(2).row(); for(var r2=0;r2<ready.length;r2++) rowCard(ready[r2], r2); }
        if(locked.length){ body.add("[gray]" + tr("Not researched", "Nao pesquisado")).padTop(6).row(); for(var l=0;l<locked.length;l++) rowCard(locked[l], l); }
        if(other.length){ body.add("[yellow]" + tr("Blocked", "Bloqueado")).padTop(6).row(); for(var o=0;o<other.length;o++) rowCard(other[o], o); }
        if(maxed.length){ body.add("[lime]" + tr("Max", "Max")).padTop(6).row(); for(var m=0;m<maxed.length;m++) rowCard(maxed[m], m); }
        if(ultReady.length){
            body.add("[#ffd54f]" + tr("◆ ULTIMATE ◆  (after COMBO)", "◆ ULTIMATE ◆  (depois do COMBO)")).padTop(10).row();
            body.add("[#ffe082]" + tr("Very expensive — massive fire rate.", "Muito caro — cadencia absurda.")).wrap().row();
            for(var uu=0;uu<ultReady.length;uu++) rowCard(ultReady[uu], uu);
        }
        if(finReady.length){
            body.add("[#ff5252]" + tr("★ FINAL ★  (after ULTIMATE)", "★ FINAL ★  (depois do ULTIMATE)")).padTop(10).row();
            body.add("[#ff8a80]" + tr("Extremely expensive — maximum fire rate.", "Extremamente caro — cadencia maxima.")).wrap().row();
            for(var ff=0;ff<finReady.length;ff++) rowCard(finReady[ff], ff);
        }
    }

    installPane = dialog.cont.pane(body).grow().pad(6).get();
    var yScroll = 0;
    try{ yScroll = restoreScrollY != null ? restoreScrollY : uiScrollGet(scrollKey); }catch(eY){}
    // Force scroll before show (instant) + again on shown
    try{
        if(installPane.setScrollYForce != null) installPane.setScrollYForce(yScroll);
        else installPane.setScrollY(yScroll);
    }catch(eF){}
    try{
        dialog.shown(function(){
            try{
                if(installPane == null) return;
                if(installPane.setScrollYForce != null) installPane.setScrollYForce(yScroll);
                else installPane.setScrollY(yScroll);
                try{ installPane.layout(); }catch(eL){}
            }catch(eS){}
        });
    }catch(eSh){}
    dialog.show();
    // Extra frames in case layout recalculates height
    try{
        Core.app.post(function(){
            try{
                if(installPane == null) return;
                if(installPane.setScrollYForce != null) installPane.setScrollYForce(yScroll);
                else installPane.setScrollY(yScroll);
            }catch(e1){}
        });
        Timer.schedule(function(){
            try{
                if(installPane == null) return;
                if(installPane.setScrollYForce != null) installPane.setScrollYForce(yScroll);
                else installPane.setScrollY(yScroll);
            }catch(e2){}
        }, 0);
        Timer.schedule(function(){
            try{
                if(installPane != null && dialog.isShown && dialog.isShown()){
                    uiScrollSet(scrollKey, installPane.getScrollY());
                }
            }catch(e3){}
        }, 0.4);
    }catch(e){}
}



function mouseWorldXY(){
    try{
        if(typeof Core.input.mouseWorldX === "function"){
            return {x: Core.input.mouseWorldX(), y: Core.input.mouseWorldY()};
        }
    }catch(e0){}
    try{
        var v = Core.input.mouseWorld(Core.camera);
        if(v != null) return {x: v.x, y: v.y};
    }catch(e1){}
    try{
        // fallback: convert screen to world
        var sx = Core.input.mouseX();
        var sy = Core.input.mouseY();
        var wx = Core.camera.position.x + (sx - Core.graphics.getWidth()/2) / Core.camera.zoom;
        var wy = Core.camera.position.y + (Core.graphics.getHeight()/2 - sy) / Core.camera.zoom;
        return {x: wx, y: wy};
    }catch(e2){}
    return {x:0, y:0};
}

function isPlayerTouching(){
    try{
        if(Core.input.isTouched && Core.input.isTouched()) return true;
    }catch(e0){}
    try{
        if(Core.input.keyDown && Core.input.keyDown(KeyCode.mouseLeft)) return true;
    }catch(e1){}
    return false;
}

function isPlayerPlacing(){
    try{
        if(Vars.control != null && Vars.control.input != null){
            if(Vars.control.input.isDroppingLine && Vars.control.input.isDroppingLine()) return true;
            if(Vars.control.input.block != null) return true;
            if(Vars.control.input.isPlacing && Vars.control.input.isPlacing()) return true;
        }
    }catch(e){}
    return false;
}

function buildUnderMouse(){
    try{
        var w = mouseWorldXY();
        var tile = Vars.world.tileWorld(w.x, w.y);
        if(tile == null) return null;
        if(tile.build != null) return tile.build;
        // Walls / 1x1: also check nearby tiles (finger precision)
        try{
            for(var dx = -1; dx <= 1; dx++){
                for(var dy = -1; dy <= 1; dy++){
                    if(dx === 0 && dy === 0) continue;
                    var t2 = Vars.world.tile(tile.x + dx, tile.y + dy);
                    if(t2 != null && t2.build != null && sameTeamBuild(t2.build)) return t2.build;
                }
            }
        }catch(eN){}
        return null;
    }catch(e){ return null; }
}

function collectSameTypeInRect(blockType, team, x1, y1, x2, y2){
    var list = [];
    if(blockType == null || team == null) return list;
    var minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
    var minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
    // pad a little so edge buildings count
    var pad = Vars.tilesize * 0.35;
    minX -= pad; maxX += pad; minY -= pad; maxY += pad;
    try{
        Groups.build.each(function(b){
            try{
                if(b == null || !b.isValid()) return;
                if(b.team != team) return;
                if(b.block != blockType) return;
                if(b.x < minX || b.x > maxX || b.y < minY || b.y > maxY) return;
                list.push(b);
            }catch(e1){}
        });
    }catch(e){}
    return list;
}

function finalizeAreaSelection(){
    try{
        if(areaSelectOriginBuild == null || areaSelectBlock == null) return;
        var team = Vars.player != null ? Vars.player.team() : null;
        var list = collectSameTypeInRect(
            areaSelectBlock, team,
            areaSelectStartX, areaSelectStartY,
            areaSelectEndX, areaSelectEndY
        );
        if(list.length === 0){
            // at least keep origin
            list = [areaSelectOriginBuild];
        }
        selectedBuilds = [];
        for(var i = 0; i < list.length; i++){
            try{ addToBuildSelection(list[i]); }catch(eA){}
        }
        if(selectedBuilds.length > 0){
            lastSelected = selectedBuilds[0];
            try{
                if(selectTable != null){
                    selectTable.visible = true;
                    selectTable.toFront();
                }
            }catch(eS){}
            selectGraceUntil = Time.time + 40;
        }
    }catch(e){}
}

function resetAreaSelect(){
    areaSelectActive = false;
    areaSelectHolding = false;
    areaSelectOriginBuild = null;
    areaSelectBlock = null;
    areaSelectHoldStart = -1;
}

function updateAreaSelect(){
    if(Vars.headless || Vars.state == null || !Vars.state.isGame() || Vars.player == null) return;
    if(isPlayerPlacing()){ resetAreaSelect(); return; }

    var touching = isPlayerTouching();
    if(!touching){
        if(areaSelectActive){
            finalizeAreaSelection();
        }
        resetAreaSelect();
        return;
    }

    var w = mouseWorldXY();
    var under = buildUnderMouse();

    if(!areaSelectActive && !areaSelectHolding){
        // start hold only on upgradable same-team build
        if(under == null || !sameTeamBuild(under)) return;
        try{
            var bn = under.block != null ? (""+under.block.name) : "";
            if(blockHasUpgradesCache[bn] !== true){
                blockHasUpgradesCache[bn] = upgradesForBlock(under.block).length > 0;
                if(!blockHasUpgradesCache[bn]) return;
            }
        }catch(eC){}
        areaSelectHolding = true;
        areaSelectOriginBuild = under;
        areaSelectBlock = under.block;
        areaSelectStartX = under.x;
        areaSelectStartY = under.y;
        areaSelectEndX = w.x;
        areaSelectEndY = w.y;
        areaSelectHoldStart = Time.time;
        return;
    }

    if(areaSelectHolding && !areaSelectActive){
        // still holding — check time
        if(Time.time - areaSelectHoldStart >= AREA_HOLD_TIME){
            areaSelectActive = true;
            // seed selection with origin
            selectedBuilds = [];
            addToBuildSelection(areaSelectOriginBuild);
            lastSelected = areaSelectOriginBuild;
            try{
                if(selectTable != null){
                    selectTable.visible = true;
                    selectTable.toFront();
                }
            }catch(eB){}
        }else{
            // cancelled if finger moved far before hold completes
            try{
                var dx0 = w.x - areaSelectStartX;
                var dy0 = w.y - areaSelectStartY;
                if(dx0*dx0 + dy0*dy0 > (Vars.tilesize * 2.5) * (Vars.tilesize * 2.5)){
                    // user is dragging camera/schematic — abort hold
                    if(under != areaSelectOriginBuild){
                        resetAreaSelect();
                        return;
                    }
                }
            }catch(eM){}
        }
    }

    if(areaSelectActive){
        areaSelectEndX = w.x;
        areaSelectEndY = w.y;
        var team = Vars.player.team();
        var list = collectSameTypeInRect(
            areaSelectBlock, team,
            areaSelectStartX, areaSelectStartY,
            areaSelectEndX, areaSelectEndY
        );
        selectedBuilds = [];
        for(var i = 0; i < list.length; i++){
            try{ addToBuildSelection(list[i]); }catch(e2){}
        }
        if(selectedBuilds.length > 0) lastSelected = selectedBuilds[0];
        selectGraceUntil = Time.time + 20;
        try{
            if(selectTable != null){
                selectTable.visible = true;
                selectTable.toFront();
            }
        }catch(e3){}
    }
}

function drawAreaSelectRect(){
    if(!areaSelectActive || Vars.headless) return;
    try{
        var x1 = areaSelectStartX, y1 = areaSelectStartY;
        var x2 = areaSelectEndX, y2 = areaSelectEndY;
        var cx = (x1 + x2) / 2;
        var cy = (y1 + y2) / 2;
        var w = Math.abs(x2 - x1);
        var h = Math.abs(y2 - y1);
        if(w < 4) w = 4;
        if(h < 4) h = 4;
        Draw.color(0.55, 0.35, 1, 0.22);
        Fill.rect(cx, cy, w, h);
        Draw.color(0.7, 0.5, 1, 0.9);
        Lines.stroke(1.2);
        Lines.rect(cx - w/2, cy - h/2, w, h);
        Draw.color();
    }catch(e){}
}


function setupSelectUi(){
    try{
        if(selectTable != null){
            try{ selectTable.remove(); }catch(e0){}
        }
        selectTable = new Table();

        var barW = Vars.mobile ? 300 : 280;
        var barH = 52;
        var hasSaved = Core.settings.has(INSTALL_BAR_X) && Core.settings.has(INSTALL_BAR_Y);
        var sx, sy;
        if(hasSaved){
            sx = Core.settings.getFloat(INSTALL_BAR_X, 0);
            sy = Core.settings.getFloat(INSTALL_BAR_Y, 0);
            sx = Mathf.clamp(sx, 0, Math.max(0, Core.graphics.getWidth() - barW));
            sy = Mathf.clamp(sy, 0, Math.max(0, Core.graphics.getHeight() - barH));
            selectTable.setSize(barW, barH);
            selectTable.setPosition(sx, sy);
        }else{
            // Default: bottom center, always visible on screen
            selectTable.setFillParent(true);
            selectTable.bottom().marginBottom(Vars.mobile ? 120 : 80);
        }

        var dragging = false;
        var dragDx = 0, dragDy = 0;

        var inner = new Table(Tex.pane);
        inner.defaults().pad(3);

        // Move handle
        var moveBtn = inner.button(Icon.resize, Styles.cleari, function(){}).size(42, 42).get();
        try{
            moveBtn.addListener(extend(InputListener, {
                touchDown: function(event, x, y, pointer, button){
                    // If still fill-parent, convert to free floating at current visual pos
                    if(selectTable.getWidth() >= Core.graphics.getWidth() - 4){
                        selectTable.setFillParent(false);
                        selectTable.setSize(barW, barH);
                        selectTable.setPosition((Core.graphics.getWidth() - barW) / 2, Vars.mobile ? 120 : 80);
                    }
                    dragging = true;
                    dragDx = x;
                    dragDy = y;
                    return true;
                },
                touchDragged: function(event, x, y, pointer){
                    if(!dragging) return;
                    var nx = selectTable.x + (x - dragDx);
                    var ny = selectTable.y + (y - dragDy);
                    nx = Mathf.clamp(nx, 0, Math.max(0, Core.graphics.getWidth() - selectTable.getWidth()));
                    ny = Mathf.clamp(ny, 0, Math.max(0, Core.graphics.getHeight() - selectTable.getHeight()));
                    selectTable.setPosition(nx, ny);
                },
                touchUp: function(event, x, y, pointer, button){
                    if(dragging){
                        try{
                            Core.settings.put(INSTALL_BAR_X, java.lang.Float(selectTable.x));
                            Core.settings.put(INSTALL_BAR_Y, java.lang.Float(selectTable.y));
                        }catch(eSave){
                            try{
                                Core.settings.put(INSTALL_BAR_X, selectTable.x);
                                Core.settings.put(INSTALL_BAR_Y, selectTable.y);
                            }catch(e2){}
                        }
                    }
                    dragging = false;
                }
            }));
        }catch(eLis){}

        inner.button(tr("Install", "Instalar"), Icon.up, function(){
            try{ if(Time.time < selectGraceUntil) return; }catch(eG){}
            if(lastSelected != null) showInstallDialog(lastSelected);
        }).size(Vars.mobile ? 120 : 110, 42);
        inner.button(tr("Cancel", "Cancelar"), Icon.cancel, function(){
            clearBuildSelection();
        }).size(Vars.mobile ? 90 : 80, 42);

        if(hasSaved){
            selectTable.add(inner);
        }else{
            selectTable.add(inner).pad(2);
        }

        selectTable.visible = false;
        selectTable.touchable = Touchable.enabled;
        Core.scene.add(selectTable);
        Log.info("Tomares: install bar ready");
    }catch(e){
        Log.err("Tomares setupSelectUi: " + e);
    }
}

Events.on(TapEvent, function(e){
    try{
        // Client-only: never show selection UI for other players
        if(Vars.headless) return;
        if(e.tile == null || e.tile.build == null || Vars.player == null) return;
        try{ if(e.player != null && e.player !== Vars.player) return; }catch(eP){}
        var build = e.tile.build;
        if(build.team != Vars.player.team()) return;
        // Fast cache — avoid full upgradesForBlock on every single tap
        try{
            var bn = build.block != null ? (""+build.block.name) : "";
            if(blockHasUpgradesCache[bn] !== true){
                blockHasUpgradesCache[bn] = upgradesForBlock(build.block).length > 0;
                if(!blockHasUpgradesCache[bn]) return;
            }
        }catch(eUp){ if(upgradesForBlock(build.block).length <= 0) return; }

        var now = Time.time;
        var same = pendingSelectBuild === build;
        var fastEnough = (now - pendingSelectTime) <= DOUBLE_TAP_WINDOW;

        // First click only prepares. Second click on the same building shows the install bar.
        if(!same || !fastEnough){
            pendingSelectBuild = build;
            pendingSelectTime = now;
            return;
        }

        pendingSelectBuild = null;
        pendingSelectTime = -999999;
        addToBuildSelection(build);
        try{ selectCacheKey = "" + build.block.name; }catch(eK){}
        selectGraceUntil = Time.time + 25;
        // Show bar immediately (no extra frame delay when possible)
        try{
            if(selectTable != null && lastSelected != null){
                selectTable.visible = true;
                selectTable.toFront();
            }
        }catch(eImm){}
        try{
            Core.app.post(function(){
                try{
                    if(selectTable != null && lastSelected != null){
                        selectTable.visible = true;
                        selectTable.toFront();
                    }
                }catch(eV){}
            });
        }catch(eP){
            try{ if(selectTable != null){ selectTable.visible = true; } }catch(e2){}
        }
    }catch(err){}
});

// Client-only visual feedback for the selected building.
Events.run(Trigger.update, function(){
    try{ updateAreaSelect(); }catch(eA){}
});

Events.run(Trigger.draw, function(){
    try{ drawAreaSelectRect(); }catch(eR){}
    try{
        if(Vars.headless || Vars.player == null) return;
        try{ pruneSelectedBuilds(); }catch(eP){}
        var list = selectedBuilds;
        if(list == null || list.length === 0){
            if(lastSelected != null){
                try{ if(lastSelected.isValid()) list = [lastSelected]; }catch(eL){ return; }
            }else return;
        }
        var multi = list.length > 1;
        Draw.z(Layer.effect);
        if(multi) Draw.color(0.7, 0.53, 1, 0.9);
        else Draw.color(1, 1, 0.15, 0.9);
        Lines.stroke(multi ? 1.05 : 0.9);
        for(var i = 0; i < list.length; i++){
            var b = list[i];
            try{
                if(b == null || !b.isValid()) continue;
                if(Vars.player != null && b.team != Vars.player.team()) continue;
                var size = b.block != null ? b.block.size : 1;
                Lines.square(b.x, b.y, size * Vars.tilesize / 2 + 2);
            }catch(eOne){}
        }
        Draw.reset();
    }catch(e){}
});

// Draw installed drill upgrades directly above the drill sprite.
Events.run(Trigger.draw, function(){
    try{ drawDrillUpgradeOverlays(); }catch(e){}
    try{ drawFactoryUpgradeOverlays(); }catch(eF){}
    try{ drawUpgradeHeatMap(); }catch(e2){}
});


// ---------- Drill upgrade overlay sprites ----------
// Sprite variants are authored around a 3x3 / 96px drill. A dedicated 2x2
// water texture is used where supplied by the asset pack.
var DRILL_SPEED_1_REGION = null;
var DRILL_SPEED_2_REGION = null;
var DRILL_SPEED_3_REGION = null;
var DRILL_WATER_3_REGION = null;
var DRILL_WATER_2_REGION = null;

function drillOverlayRegion(name){
    try{
        var keys = [
            "new-techs-" + name,
            "newtechs-" + name,
            name,
            "new-techs-" + name.replace(/\.png$/i, "")
        ];
        for(var i = 0; i < keys.length; i++){
            try{
                var r = Core.atlas.find(keys[i]);
                if(r != null && r.found && r.found()) return r;
            }catch(e1){}
        }
    }catch(e){}
    return null;
}
function reloadDrillOverlayRegions(){
    try{
        DRILL_SPEED_1_REGION = drillOverlayRegion("drill-upgrade-speed-1of3");
        DRILL_SPEED_2_REGION = drillOverlayRegion("drill-upgrade-speed-2of3");
        DRILL_SPEED_3_REGION = drillOverlayRegion("drill-upgrade-speed-3of3");
        DRILL_WATER_3_REGION = drillOverlayRegion("water-condition-upgrade");
        DRILL_WATER_2_REGION = drillOverlayRegion("2x2-drill-water-upgrade");
    }catch(e){}
}

function isNewTechDrillBlock(block){
    if(block == null) return false;
    try{
        var g = BLOCK_GROUPS["" + block.name];
        if(g != null && g.isDrillGroup) return true;
    }catch(e){}
    try{
        var cls = classNameOf(block).toLowerCase();
        var n = ("" + block.name).toLowerCase();
        return cls.indexOf("drill") >= 0 || n.indexOf("drill") >= 0;
    }catch(e2){}
    return false;
}

function drillSpeedUpgradeForBlock(block){
    try{
        var g = BLOCK_GROUPS["" + block.name];
        if(g == null || g.upgrades == null) return null;
        // Drill core #1 is the speed upgrade in the New Tech's drill groups.
        // Keep this data-driven so both the original named upgrades and the
        // generated v4 groups use the same overlay logic.
        for(var i = 0; i < g.upgrades.length; i++){
            var u = UPGRADES[g.upgrades[i]];
            if(u == null || u.conditional) continue;
            if((u.max|0) >= 3) return u;
        }
    }catch(e){}
    return null;
}

function drillOverlayState(build){
    var state = {speedLevel:0, water:false};
    if(build == null || build.block == null || !isNewTechDrillBlock(build.block)) return state;

    try{
        var speedUp = drillSpeedUpgradeForBlock(build.block);
        if(speedUp != null) state.speedLevel = Math.min(3, getApplied(build, speedUp.id)|0);
    }catch(e){}

    // A water/liquid conditional texture is an INSTALLATION marker: once the
    // conditional upgrade is installed, keep its texture visible. It no longer
    // waits for the water condition to be currently satisfied.
    try{
        var g = BLOCK_GROUPS["" + build.block.name];
        if(g != null && g.upgrades != null){
            for(var i = 0; i < g.upgrades.length; i++){
                var u = UPGRADES[g.upgrades[i]];
                if(u == null || !u.conditional || getApplied(build, u.id) <= 0) continue;
                if(u.condition != null && u.condition.mode === "liquid"){
                    state.water = true;
                    break;
                }
            }
        }
    }catch(e2){}
    return state;
}


// ----- Factory upgrade overlays (tinted by factory type) -----
var FACTORY_OV_35 = null;
var FACTORY_OV_75 = null;
var FACTORY_OV_100 = null;

function reloadFactoryOverlayRegions(){
    FACTORY_OV_35 = drillOverlayRegion("factory-upgrade-35");
    FACTORY_OV_75 = drillOverlayRegion("factory-upgrade-75");
    FACTORY_OV_100 = drillOverlayRegion("factory-upgrade-100");
}

function isNewTechFactoryBlock(block){
    if(block == null) return false;
    try{
        var cls = classNameOf(block).toLowerCase();
        if(cls.indexOf("genericcrafter") >= 0 || cls.indexOf("crafter") >= 0) return true;
        if(cls.indexOf("smelter") >= 0 || cls.indexOf("compressor") >= 0) return true;
        if(cls.indexOf("separator") >= 0 || cls.indexOf("weaver") >= 0) return true;
        if(cls.indexOf("cultivator") >= 0 || cls.indexOf("spacetree") >= 0) return true;
    }catch(e){}
    try{
        var n = (""+block.name).toLowerCase();
        if(n.indexOf("smelter") >= 0 || n.indexOf("press") >= 0 || n.indexOf("kiln") >= 0) return true;
        if(n.indexOf("compressor") >= 0 || n.indexOf("weaver") >= 0 || n.indexOf("mixer") >= 0) return true;
        if(n.indexOf("pulverizer") >= 0 || n.indexOf("melter") >= 0 || n.indexOf("separator") >= 0) return true;
        if(n.indexOf("cultivator") >= 0 || n.indexOf("cryofluid") >= 0 || n.indexOf("oil-extractor") >= 0) return true;
        if(n.indexOf("plastanium") >= 0 && n.indexOf("conveyor") < 0) return true;
        if(n.indexOf("silicon") >= 0 && (n.indexOf("smelter") >= 0 || n.indexOf("crucible") >= 0)) return true;
    }catch(e2){}
    try{
        var cat = categoryOfBlock(block);
        if(cat === "crafting") return true;
    }catch(e3){}
    return false;
}

/** Max installed rank on this factory (any upgrade id). */
function factoryInstallRank(build){
    if(build == null) return 0;
    var best = 0;
    try{
        var m = appliedMap[bkey(build)];
        if(m == null) return 0;
        var ids = Object.keys(m);
        for(var i = 0; i < ids.length; i++){
            var lv = m[ids[i]]|0;
            if(lv > best) best = lv;
        }
    }catch(e){}
    return best;
}

/**
 * Tint color for factory overlay — alt/opposite-ish of the factory theme, slightly darker.
 * Plastanium → dark green; Silicon → white/light; etc.
 */
function factoryOverlayColor(block){
    var n = "";
    try{ n = (""+block.name).toLowerCase(); }catch(e){}
    // [r,g,b,a]
    if(n.indexOf("plastanium") >= 0) return [0.25, 0.55, 0.32, 0.92];      // dark green
    if(n.indexOf("silicon") >= 0) return [0.92, 0.92, 0.95, 0.90];         // white / default light
    if(n.indexOf("phase") >= 0) return [0.55, 0.30, 0.70, 0.90];            // dark purple
    if(n.indexOf("surge") >= 0) return [0.75, 0.65, 0.20, 0.90];            // dark gold
    if(n.indexOf("kiln") >= 0 || n.indexOf("melter") >= 0) return [0.70, 0.40, 0.22, 0.90]; // dark orange
    if(n.indexOf("graphite") >= 0 || n.indexOf("press") >= 0) return [0.40, 0.42, 0.48, 0.90]; // dark gray-blue
    if(n.indexOf("pulverizer") >= 0) return [0.50, 0.38, 0.28, 0.90];       // brown
    if(n.indexOf("cryo") >= 0) return [0.25, 0.55, 0.70, 0.90];              // dark cyan
    if(n.indexOf("oil") >= 0 || n.indexOf("coal") >= 0) return [0.35, 0.30, 0.28, 0.90];
    if(n.indexOf("spore") >= 0 || n.indexOf("cultivator") >= 0) return [0.35, 0.50, 0.28, 0.90];
    if(n.indexOf("separator") >= 0 || n.indexOf("disassembler") >= 0) return [0.55, 0.45, 0.35, 0.90];
    if(n.indexOf("alloy") >= 0) return [0.45, 0.50, 0.55, 0.90];
    // default: slightly darker accent gray
    return [0.55, 0.58, 0.62, 0.88];
}

function drawFactoryUpgradeOverlays(){
    if(Vars.headless) return;
    try{
        if(FACTORY_OV_35 == null || (FACTORY_OV_35.found && !FACTORY_OV_35.found())){
            reloadFactoryOverlayRegions();
        }
    }catch(eR){}
    if(FACTORY_OV_35 == null){
        reloadFactoryOverlayRegions();
    }

    var targets = cachedBoostTargets || [];
    if(targets.length === 0) return;

    for(var ti = 0; ti < targets.length; ti++){
        var build = targets[ti];
        try{
            if(build == null || !build.isValid() || build.block == null) continue;
            if(!isNewTechFactoryBlock(build.block)) continue;
            var rank = factoryInstallRank(build);
            if(rank <= 0) continue;

            var region = FACTORY_OV_35;
            if(rank >= 3 && FACTORY_OV_100 != null) region = FACTORY_OV_100;
            else if(rank >= 2 && FACTORY_OV_75 != null) region = FACTORY_OV_75;
            if(region == null || (region.found && !region.found())) continue;

            var size = Math.max(1, build.block.size || 1);
            // Sprite base is 3x3 (96px). Scale to actual block size.
            var worldSize = size * Vars.tilesize;
            var col = factoryOverlayColor(build.block);
            Draw.z(Layer.block + 0.5);
            Draw.color(col[0], col[1], col[2], col[3]);
            Draw.rect(region, build.x, build.y, worldSize, worldSize);
            Draw.color();
        }catch(eOne){}
    }
}


function drawDrillUpgradeOverlays(){
    if(Vars.headless) return;
    try{
        if(DRILL_SPEED_1_REGION == null || (DRILL_SPEED_1_REGION.found && !DRILL_SPEED_1_REGION.found())){
            reloadDrillOverlayRegions();
        }
    }catch(eR){}

    if(DRILL_SPEED_2_REGION == null){
        DRILL_SPEED_1_REGION = drillOverlayRegion("drill-upgrade-speed-1of3");
        DRILL_SPEED_2_REGION = drillOverlayRegion("drill-upgrade-speed-2of3");
        DRILL_SPEED_3_REGION = drillOverlayRegion("drill-upgrade-speed-3of3");
        DRILL_WATER_3_REGION = drillOverlayRegion("water-condition-upgrade");
        DRILL_WATER_2_REGION = drillOverlayRegion("2x2-drill-water-upgrade");
    }

    var targets = cachedBoostTargets || [];
    if(targets.length === 0) return;

    for(var ti = 0; ti < targets.length; ti++){
        var build = targets[ti];
        try{
            if(build == null || !build.isValid() || build.block == null) continue;
            if(!isNewTechDrillBlock(build.block)) continue;

            var state = drillOverlayState(build);
            if(state.speedLevel <= 1 && !state.water) continue;

            var size = Math.max(1, build.block.size || 1);
            var worldSize = size * Vars.tilesize;

            // Water texture must sit above the drill body but UNDER the rotating
            // part. Drill.java draws rotator/top starting at blockAfterCracks.
            // A tiny offset keeps this layer below the rotator without hiding it.
            if(state.water){
                var waterRegion = size === 2 && DRILL_WATER_2_REGION != null && DRILL_WATER_2_REGION.found()
                    ? DRILL_WATER_2_REGION
                    : DRILL_WATER_3_REGION;
                if(waterRegion != null && waterRegion.found()){
                    Draw.z(Layer.blockAfterCracks - 0.01);
                    Draw.rect(waterRegion, build.x, build.y, worldSize, worldSize);
                }
            }

            // Speed upgrades are always on top of the drill's rotator/top layers.
            var speedRegion = state.speedLevel >= 3 ? DRILL_SPEED_3_REGION :
                (state.speedLevel >= 2 ? DRILL_SPEED_2_REGION :
                (state.speedLevel >= 1 ? DRILL_SPEED_1_REGION : null));
            if(speedRegion != null && speedRegion.found()){
                Draw.z(Layer.blockOver + 0.1);
                Draw.rect(speedRegion, build.x, build.y, worldSize, worldSize);
            }

            Draw.reset();
        }catch(e){}
    }
}

function addHudResearch(){
    try{
        if(researchHudTable != null){
            try{ researchHudTable.remove(); }catch(eR){}
        }
        researchHudTable = new Table();
        researchHudTable.setFillParent(true);
        researchHudTable.top().right().margin(10);
        // Big obvious button so it never "disappears" on mobile
        researchHudTable.button(Icon.book, Styles.defaulti, function(){
            showResearchDialog();
        }).size(Vars.mobile ? 64 : 56, Vars.mobile ? 64 : 56).name("tomares-hud-research").tooltip(tr("New Tech's", "New Tech's"));
        researchHudTable.visible = true;
        Core.scene.add(researchHudTable);
        Log.info("Tomares: research HUD button added");
    }catch(e){
        Log.err("Tomares HUD: " + e);
        // Last resort: absolute positioned table
        try{
            researchHudTable = new Table();
            researchHudTable.setSize(64, 64);
            researchHudTable.setPosition(Core.graphics.getWidth() - 74, Core.graphics.getHeight() - 120);
            researchHudTable.button(tr("T", "T"), function(){ showResearchDialog(); }).size(64, 64);
            Core.scene.add(researchHudTable);
        }catch(e2){ Log.err("Tomares HUD fallback: " + e2); }
    }
}

Events.run(Trigger.update, function(){
    try{
        if(Vars.state == null || !Vars.state.isPlaying()) return;
        var t = Time.time|0;
        if(t - lastBulletSweepTick < 2) return;
        lastBulletSweepTick = t;
        sweepBulletsRuntime();
    }catch(e){}
});

Events.on(ClientLoadEvent, function(e){
    if(!Core.settings.has(LANG_KEY)) Core.settings.put(LANG_KEY, "en");
    try{ registerNewTechsSettingsCategory(); }catch(eS){}
    try{ Core.app.post(function(){ try{ registerNewTechsSettingsCategory(); }catch(e2){} }); }catch(eS2){}
    loadHistory();
    try{ Timer.schedule(function(){ try{ registerExclusiveRollUpgrades(); }catch(eEx){} }, 0.25); }catch(eEx2){}
    try{ Timer.schedule(function(){ try{ reloadDrillOverlayRegions(); }catch(eD){}
                try{ reloadFactoryOverlayRegions(); }catch(eF){}
                try{ ntAttachAllPowerBoostLogic(); }catch(ePow){} }, 0.5); }catch(eT){}
    setupNetHandlers();
    ensureCatalogBuilt();
    refreshGlobalBoostRanks();
    try{ applyAllBulletUpgrades(); }catch(e0){}

    try{
        if(!newTechsSettingsRegistered) Vars.ui.settings.addCategory("New Tech's", Icon.settings, function(st){
            st.table(Styles.none, function(r){
                r.add("Language / Idioma").row();
                r.button("English", function(){ Core.settings.put(LANG_KEY,"en"); Vars.ui.showInfo("Language: English"); }).size(200,50).row();
                r.button("Português", function(){ Core.settings.put(LANG_KEY,"pt"); Vars.ui.showInfo("Idioma: Português"); }).size(200,50).row();
                r.button("Español", function(){ Core.settings.put(LANG_KEY,"es"); Vars.ui.showInfo("Idioma: Español"); }).size(200,50).row();
                r.button("Tiếng Việt", function(){ Core.settings.put(LANG_KEY,"vi"); Vars.ui.showInfo("Ngôn ngữ: Tiếng Việt"); }).size(200,50).row();
                r.add("HUD").padTop(8).row();
                r.button(tr("Open research", "Abrir pesquisa"), function(){
                    showResearchDialog();
                }).size(260,50).row();
                r.button(tr("Restore progress", "Restaurar progresso"), Icon.refresh, function(){
                    restoreProgressEffects();
                }).size(260,50).row();
                r.button(tr("Reset install bar position", "Resetar posicao da barra"), function(){
                    Core.settings.remove(INSTALL_BAR_X);
                    Core.settings.remove(INSTALL_BAR_Y);
                    try{ setupSelectUi(); }catch(eR){}
                    Vars.ui.showInfo(tr("Install bar position reset.", "Posicao da barra resetada."));
                }).size(260,50).row();
                r.add("[scarlet]" + tr("Danger", "Perigo")).padTop(10).row();
                r.button(tr("Reset all progress", "Resetar todo progresso"), Icon.trash, function(){
                    Vars.ui.showConfirm(
                        tr("Reset ALL research progress for New Tech's? This cannot be undone.",
                           "Resetar TODO o progresso de pesquisa do New Tech's? Nao da para desfazer."),
                        function(){ resetAllProgress(); }
                    );
                }).size(260,50).row();
            }).growX().pad(8);
        });
    }catch(err){}

    Vars.ui.paused.shown(function(){
        // No pause-menu button — only minimap HUD. Clean any leftover overlay.
        try{ injectCategoryMainButton(); }catch(e){}
    });

    // Admin button only if name contains "dummy" (any case)
    try{
        Vars.ui.settings.shown(function(){
            settingsAdminInjected = false;
            Core.app.post(function(){ try{ injectSettingsAdminButton(); }catch(e){} });
            Timer.schedule(function(){ try{ injectSettingsAdminButton(); }catch(e){} }, 0.05);
            Timer.schedule(function(){ try{ injectSettingsAdminButton(); }catch(e){} }, 0.2);
        });
    }catch(eSet){ Log.err("New Tech's settings hook: " + eSet); }
    try{
        Vars.ui.paused.hidden(function(){
            try{ if(pauseTechTable != null) pauseTechTable.visible = false; }catch(e){}
        });
    }catch(eH){}

    addHudResearch();
    setupSelectUi();
    try{ setupPointsHud(); }catch(eHud){}

    // Lightweight UI visibility — throttled, no per-frame catalog work
    var lastUiTick = 0;
    var cachedSelectOk = false;
    Events.run(Trigger.update, function(){
        try{
            if(Time != null && Time.time - lastUiTick < 40) return; // ~1.5 times/sec (FPS)
            lastUiTick = Time != null ? Time.time : lastUiTick + 12;
            var inGame = Vars.state != null && Vars.state.isGame();
            var paused = Vars.ui != null && Vars.ui.paused != null && Vars.ui.paused.isShown();
            if(researchHudTable != null) researchHudTable.visible = inGame && !paused;
            if(pointsHudTable != null) pointsHudTable.visible = false;
            if(pauseTechTable != null){ try{ pauseTechTable.visible = false; pauseTechTable.remove(); }catch(eZ){} pauseTechTable = null; }
            if(selectTable != null){
                try{ pruneSelectedBuilds(); }catch(ePr){}
                var b = lastSelected;
                var ok = inGame && !Vars.headless && Vars.player != null && b != null;
                try{ if(ok && !b.isValid()) ok = false; }catch(eI){ ok = false; }
                try{ if(ok && b.team != Vars.player.team()) ok = false; }catch(eT){}
                try{ if(!ok && Time.time < selectGraceUntil && b != null) ok = true; }catch(eG){}
                selectTable.visible = !!ok;
            }
        }catch(eVis){}
    });
});

Events.on(WorldLoadEvent, function(e){
    persistentLevels = {};
    persistentPartial = {};
    persistentMissions = {};
    persistentPoints = 0;
    persistentShop = null;
    persistentPointMissions = null;
    activeStoreKey = null;
    activeTagKey = null;
    loadPersistentState();
    try{ ntAttachAllPowerBoostLogic(); }catch(ePowW){}
    try{
        // Only touch transport system if player actually researched conveyor upgrades
        Timer.schedule(function(){
            try{
                refreshGlobalBoostRanks();
                if(!anyTransportBoostActive) return; // no conveyor research → zero work, no lag
                registerNtTransportClones();
                applyNtTransportStats();
            }catch(e1){}
        }, 1.5);
    }catch(eNtW){}
    try{
        // After assets load, copy vanilla sprites again and fix any shadow builds
        Core.app.post(function(){
            try{
                registerNtTransportClones();
                var names = Object.keys(NT_TRANSPORT);
                for(var i = 0; i < names.length; i++){
                    var e = NT_TRANSPORT[names[i]];
                    if(e != null) ntCopyVisuals(e.nt, e.vanilla);
                }
                /* convertTeamTransportBuilds skipped on join */
            }catch(eCL){}
        });
    }catch(eNtC){}
    appliedMap = {};
    cachedBoostTargets = [];
    cachedBoostTargetKeys = {};
    lastScanTick = -1000;
    lastBoostTick = -1000;
    try{ loadAppliedMap(); }catch(eAp){}
    try{ reloadDrillOverlayRegions(); }catch(eDr){}
    ensureCatalogBuilt();
    refreshGlobalBoostRanks();
    // The catalog is built before a world exists on ClientLoad; after WorldLoad
    // the persistent research state is finally available, so apply researched
    // custom ammo now and again after any network tag/sync step.
        masterAppliedTeamId = -1;
    masterActivationKey = null;
    try{ activateResearchedMasters(); }catch(err){}
    try{ applyAllBulletUpgrades(); }catch(errB){}
    try{
        if(Vars.net != null && Vars.net.client()) requestSyncFromHost();
        else readHostTags();
        if(Vars.net != null && Vars.net.server()) broadcastSync();
    }catch(errN){}
    lastBoostTick = -1000;
    lastSelected = null;
});

Events.on(SaveWriteEvent, function(e){
    try{ savePersistentState(true); }catch(err){}
    try{ saveAppliedMap(); }catch(err2){}
});

Events.on(ResetEvent, function(e){
    try{ savePersistentState(true); }catch(err){}
});

Events.on(DisposeEvent, function(e){
    try{ savePersistentState(true); }catch(err){}
});

Events.on(StateChangeEvent, function(e){
    try{ savePersistentState(true); }catch(err){}
    });


// ============================================================================
// NEW TECH'S — Master missions, point missions, shop
// ============================================================================

function progressBarText(frac, done){
    var n = 10;
    var f = frac;
    if(f < 0) f = 0;
    if(f > 1) f = 1;
    var filled = Math.round(f * n);
    var s = done ? "[lime]" : "[accent]";
    for(var i = 0; i < n; i++) s += (i < filled ? "█" : "░");
    s += "[]";
    return s;
}

function resourceProgressFraction(rem, cores){
    if(rem == null || rem.length === 0) return 1;
    var have = 0, need = 0;
    for(var i = 0; i < rem.length; i++){
        var r = rem[i];
        if(r == null || r.item == null) continue;
        need += r.amount;
        var got = 0;
        try{
            for(var c = 0; c < cores.length; c++){
                if(cores[c] != null && cores[c].items != null) got += cores[c].items.get(r.item)|0;
            }
        }catch(e){}
        have += Math.min(r.amount, got);
    }
    if(need <= 0) return 1;
    return have / need;
}

// ---- Master missions ----
function ensureMasterMission(u, block, index){
    if(u == null) return;
    if(u.mission != null) return;
    var bname = block != null ? (""+block.name) : "block";
    var idx = index|0;
    if(idx === 0){
        u.mission = { type: "build", target: 30, blockName: bname };
    }else if(idx === 1){
        u.mission = { type: "water", target: 1, blockName: bname };
    }else{
        u.mission = { type: "build", target: 45 + idx * 10, blockName: bname };
    }
    if(persistentMissions[u.id] == null){
        persistentMissions[u.id] = { progress: 0, done: false };
    }
}

function getMasterMissionProgress(id){
    var m = persistentMissions[id];
    if(m == null) return 0;
    return m.progress|0;
}

function getMasterMissionTarget(id){
    var u = MASTER_UPGRADES[id];
    if(u == null || u.mission == null) return 1;
    return u.mission.target|0;
}

function isMasterMissionComplete(id){
    var m = persistentMissions[id];
    if(m != null && m.done) return true;
    var u = MASTER_UPGRADES[id];
    if(u == null || u.mission == null) return true;
    var p = m != null ? (m.progress|0) : 0;
    return p >= (u.mission.target|0);
}

function masterMissionLabel(id){
    var u = MASTER_UPGRADES[id];
    if(u == null || u.mission == null) return tr("None", "Nenhuma");
    var m = u.mission;
    var block = null;
    try{ if(u.block != null) block = u.block(); }catch(e){}
    var loc = block != null ? (""+block.localizedName) : (m.blockName || "?");
    if(m.type === "water"){
        return tr("Place water in this block for the first time (" + loc + ")", "Colocar água neste bloco pela primeira vez (" + loc + ")");
    }
    return tr("Build this block " + m.target + " times (" + loc + ")", "Construir este bloco " + m.target + " vezes (" + loc + ")");
}

function bumpMasterMission(type, blockName, amount){
    if(blockName == null) return;
    try{ ensurePersistentState(); }catch(eE){}
    amount = amount || 1;
    var ids = Object.keys(MASTER_UPGRADES);
    var changed = false;
    for(var i = 0; i < ids.length; i++){
        var u = MASTER_UPGRADES[ids[i]];
        if(u == null || u.mission == null) continue;
        if(u.mission.type !== type) continue;
        if((""+u.mission.blockName) !== (""+blockName)) continue;
        if(persistentMissions[u.id] == null) persistentMissions[u.id] = { progress: 0, done: false };
        var st = persistentMissions[u.id];
        if(st.done) continue;
        st.progress = (st.progress|0) + amount;
        if(st.progress >= (u.mission.target|0)){
            st.progress = u.mission.target|0;
            st.done = true;
        }
        changed = true;
    }
    if(changed){
        try{ savePersistentState(false); }catch(e){}
    }
}

// ---- Points / rarity ----
var RARITY_WEIGHTS = { common: 50, uncommon: 25, rare: 15, epic: 7, legendary: 3 };
var RARITY_COLOR = {
    common: "[white]", uncommon: "[#81c784]", rare: "[#64b5f6]",
    epic: "[#ba68c8]", legendary: "[#ffd54f]"
};

function rollRarity(){
    var total = 0;
    var keys = Object.keys(RARITY_WEIGHTS);
    for(var i = 0; i < keys.length; i++) total += RARITY_WEIGHTS[keys[i]];
    var r = Math.random() * total;
    var acc = 0;
    for(var j = 0; j < keys.length; j++){
        acc += RARITY_WEIGHTS[keys[j]];
        if(r <= acc) return keys[j];
    }
    return "common";
}

function rarityPointsReward(rarity){
    // Tuned down — missions were paying too much
    if(rarity === "legendary") return 450 + ((Math.random()*150)|0);  // ~450-600
    if(rarity === "epic") return 280 + ((Math.random()*80)|0);       // ~280-360
    if(rarity === "rare") return 160 + ((Math.random()*50)|0);        // ~160-210
    if(rarity === "uncommon") return 90 + ((Math.random()*40)|0);     // ~90-130
    return 50 + ((Math.random()*30)|0);                               // ~50-80
}

function addPoints(n){
    persistentPoints = (persistentPoints|0) + (n|0);
    if(persistentPoints < 0) persistentPoints = 0;
    try{ savePersistentState(false); }catch(e){}
}

function spendPoints(n){
    n = n|0;
    if((persistentPoints|0) < n) return false;
    persistentPoints = (persistentPoints|0) - n;
    try{ savePersistentState(false); }catch(e){}
    return true;
}

// ---- Point missions (shop points, not master) ----

// Mode-aware point missions + dual shared shops (items / units), 10 slots, stock

function currentGameModeKey(){
    try{
        if(isCampaign()) return "campaign";
        if(isPvp()) return "pvp";
        var r = Vars.state != null ? Vars.state.rules : null;
        if(r == null) return "custom";
        if(r.editor) return "editor";
        if(r.attackMode) return "attack";
        if(r.infiniteResources) return "sandbox";
        if(r.waves) return "survival";
        return "custom";
    }catch(e){ return "custom"; }
}

function modeMissionPool(){
    var mode = currentGameModeKey();
    var pool = [];
    // Always available
    pool.push({ type: "build_any", target: 25, rarity: "common", en: "Build any 25 blocks", pt: "Construa 25 blocos quaisquer" });
    pool.push({ type: "build_any", target: 80, rarity: "uncommon", en: "Build any 80 blocks", pt: "Construa 80 blocos quaisquer" });
    pool.push({ type: "build_any", target: 200, rarity: "rare", en: "Build any 200 blocks", pt: "Construa 200 blocos quaisquer" });
    pool.push({ type: "core_items", target: 100, rarity: "common", en: "Deposit 100 items into cores", pt: "Deposite 100 itens nos nucleos" });
    pool.push({ type: "core_items", target: 500, rarity: "common", en: "Deposit 500 items into cores", pt: "Deposite 500 itens nos nucleos" });
    pool.push({ type: "core_items", target: 1500, rarity: "uncommon", en: "Deposit 1500 items into cores", pt: "Deposite 1500 itens nos nucleos" });
    pool.push({ type: "core_items", target: 3000, rarity: "uncommon", en: "Deposit 3000 items into cores", pt: "Deposite 3000 itens nos nucleos" });

    if(mode === "pvp" || mode === "attack"){
        pool.push({ type: "destroy_enemy", target: 1, rarity: "common", en: "Destroy 1 enemy building", pt: "Destrua 1 predio inimigo" });
        pool.push({ type: "destroy_enemy", target: 3, rarity: "common", en: "Destroy 3 enemy buildings", pt: "Destrua 3 predios inimigos" });
        pool.push({ type: "destroy_enemy", target: 5, rarity: "common", en: "Destroy 5 enemy buildings", pt: "Destrua 5 predios inimigos" });
        pool.push({ type: "destroy_enemy", target: 10, rarity: "uncommon", en: "Destroy 10 enemy buildings", pt: "Destrua 10 predios inimigos" });
        pool.push({ type: "destroy_enemy", target: 20, rarity: "common", en: "Destroy 20 enemy buildings", pt: "Destrua 20 predios inimigos" });
        pool.push({ type: "destroy_enemy", target: 60, rarity: "rare", en: "Destroy 60 enemy buildings", pt: "Destrua 60 predios inimigos" });
        pool.push({ type: "units_built", target: 5, rarity: "common", en: "Produce 5 units", pt: "Produza 5 unidades" });
        pool.push({ type: "units_built", target: 10, rarity: "uncommon", en: "Produce 10 units", pt: "Produza 10 unidades" });
        pool.push({ type: "units_built", target: 30, rarity: "epic", en: "Produce 30 units", pt: "Produza 30 unidades" });
        pool.push({ type: "build_any", target: 15, rarity: "common", en: "Build 15 blocks", pt: "Construa 15 blocos" });
    }
    if(mode === "survival" || mode === "campaign"){
        pool.push({ type: "wave", target: 5, rarity: "common", en: "Survive 5 waves", pt: "Sobreviva a 5 waves" });
        pool.push({ type: "wave", target: 15, rarity: "epic", en: "Survive 15 waves", pt: "Sobreviva a 15 waves" });
        pool.push({ type: "destroy_enemy", target: 40, rarity: "uncommon", en: "Destroy 40 enemy buildings", pt: "Destrua 40 prédios inimigos" });
        pool.push({ type: "units_built", target: 8, rarity: "uncommon", en: "Produce 8 units", pt: "Produza 8 unidades" });
    }
    if(mode === "campaign"){
        pool.push({ type: "build_any", target: 120, rarity: "rare", en: "Expand: build 120 blocks", pt: "Expanda: construa 120 blocos" });
        pool.push({ type: "core_items", target: 8000, rarity: "epic", en: "Stockpile 8000 items in cores", pt: "Estoque 8000 itens nos núcleos" });
    }
    if(mode === "sandbox" || mode === "editor"){
        pool.push({ type: "build_any", target: 50, rarity: "common", en: "Sandbox build 50 blocks", pt: "Sandbox: construa 50 blocos" });
        pool.push({ type: "build_any", target: 150, rarity: "rare", en: "Sandbox build 150 blocks", pt: "Sandbox: construa 150 blocos" });
    }
    // --- Extra missions (all modes) ---
    pool.push({ type: "build_any", target: 10, rarity: "common", en: "Quick build: 10 blocks", pt: "Construcao rapida: 10 blocos" });
    pool.push({ type: "build_any", target: 40, rarity: "common", en: "Build 40 blocks", pt: "Construa 40 blocos" });
    pool.push({ type: "build_any", target: 60, rarity: "uncommon", en: "Build 60 blocks", pt: "Construa 60 blocos" });
    pool.push({ type: "build_any", target: 100, rarity: "uncommon", en: "Build 100 blocks", pt: "Construa 100 blocos" });
    pool.push({ type: "build_any", target: 160, rarity: "rare", en: "Build 160 blocks", pt: "Construa 160 blocos" });
    pool.push({ type: "core_items", target: 50, rarity: "common", en: "Deposit 50 items into cores", pt: "Deposite 50 itens nos nucleos" });
    pool.push({ type: "core_items", target: 250, rarity: "common", en: "Deposit 250 items into cores", pt: "Deposite 250 itens nos nucleos" });
    pool.push({ type: "core_items", target: 750, rarity: "uncommon", en: "Deposit 750 items into cores", pt: "Deposite 750 itens nos nucleos" });
    pool.push({ type: "core_items", target: 2000, rarity: "rare", en: "Deposit 2000 items into cores", pt: "Deposite 2000 itens nos nucleos" });
    pool.push({ type: "core_items", target: 5000, rarity: "epic", en: "Deposit 5000 items into cores", pt: "Deposite 5000 itens nos nucleos" });
    pool.push({ type: "units_built", target: 3, rarity: "common", en: "Produce 3 units", pt: "Produza 3 unidades" });
    pool.push({ type: "units_built", target: 15, rarity: "uncommon", en: "Produce 15 units", pt: "Produza 15 unidades" });
    pool.push({ type: "units_built", target: 25, rarity: "rare", en: "Produce 25 units", pt: "Produza 25 unidades" });
    pool.push({ type: "units_built", target: 50, rarity: "epic", en: "Produce 50 units", pt: "Produza 50 unidades" });
    pool.push({ type: "wave", target: 3, rarity: "common", en: "Survive 3 waves", pt: "Sobreviva a 3 waves" });
    pool.push({ type: "wave", target: 8, rarity: "uncommon", en: "Survive 8 waves", pt: "Sobreviva a 8 waves" });
    pool.push({ type: "wave", target: 20, rarity: "rare", en: "Survive 20 waves", pt: "Sobreviva a 20 waves" });
    pool.push({ type: "wave", target: 30, rarity: "epic", en: "Survive 30 waves", pt: "Sobreviva a 30 waves" });
    pool.push({ type: "destroy_enemy", target: 8, rarity: "common", en: "Destroy 8 enemy buildings", pt: "Destrua 8 predios inimigos" });
    pool.push({ type: "destroy_enemy", target: 15, rarity: "uncommon", en: "Destroy 15 enemy buildings", pt: "Destrua 15 predios inimigos" });
    pool.push({ type: "destroy_enemy", target: 35, rarity: "rare", en: "Destroy 35 enemy buildings", pt: "Destrua 35 predios inimigos" });
    pool.push({ type: "destroy_enemy", target: 80, rarity: "epic", en: "Destroy 80 enemy buildings", pt: "Destrua 80 predios inimigos" });
    pool.push({ type: "research_any", target: 2, rarity: "common", en: "Research 2 New Tech upgrades", pt: "Pesquise 2 upgrades do New Tech" });
    pool.push({ type: "research_any", target: 5, rarity: "uncommon", en: "Research 5 New Tech upgrades", pt: "Pesquise 5 upgrades do New Tech" });
    pool.push({ type: "research_any", target: 12, rarity: "rare", en: "Research 12 New Tech upgrades", pt: "Pesquise 12 upgrades do New Tech" });
    pool.push({ type: "research_any", target: 25, rarity: "epic", en: "Research 25 New Tech upgrades", pt: "Pesquise 25 upgrades do New Tech" });
    pool.push({ type: "install_any", target: 2, rarity: "common", en: "Install 2 upgrades on buildings", pt: "Instale 2 melhorias em predios" });
    pool.push({ type: "install_any", target: 6, rarity: "uncommon", en: "Install 6 upgrades on buildings", pt: "Instale 6 melhorias em predios" });
    pool.push({ type: "install_any", target: 15, rarity: "rare", en: "Install 15 upgrades on buildings", pt: "Instale 15 melhorias em predios" });
    pool.push({ type: "install_any", target: 30, rarity: "epic", en: "Install 30 upgrades on buildings", pt: "Instale 30 melhorias em predios" });

    if(mode === "pvp" || mode === "attack"){
        pool.push({ type: "destroy_enemy", target: 2, rarity: "common", en: "First blood: destroy 2 buildings", pt: "First blood: destrua 2 predios" });
        pool.push({ type: "destroy_enemy", target: 25, rarity: "uncommon", en: "Raid: destroy 25 buildings", pt: "Raid: destrua 25 predios" });
        pool.push({ type: "units_built", target: 20, rarity: "rare", en: "Army: produce 20 units", pt: "Exercito: produza 20 unidades" });
        pool.push({ type: "install_any", target: 8, rarity: "uncommon", en: "Fortify: install 8 upgrades", pt: "Fortifique: instale 8 melhorias" });
    }
    if(mode === "campaign"){
        pool.push({ type: "research_any", target: 8, rarity: "uncommon", en: "Campaign tech: research 8 upgrades", pt: "Campanha: pesquise 8 upgrades" });
        pool.push({ type: "install_any", target: 10, rarity: "rare", en: "Campaign industry: 10 installs", pt: "Campanha industria: 10 installs" });
        pool.push({ type: "core_items", target: 12000, rarity: "legendary", en: "Mega stockpile: 12000 items", pt: "Mega estoque: 12000 itens" });
        pool.push({ type: "build_any", target: 250, rarity: "epic", en: "Sector builder: 250 blocks", pt: "Construtor de setor: 250 blocos" });
    }
    if(mode === "survival"){
        pool.push({ type: "wave", target: 12, rarity: "uncommon", en: "Hold the line: 12 waves", pt: "Segure a linha: 12 waves" });
        pool.push({ type: "wave", target: 25, rarity: "rare", en: "Wave master: 25 waves", pt: "Mestre das waves: 25 waves" });
        pool.push({ type: "destroy_enemy", target: 50, rarity: "rare", en: "Cleanse: destroy 50 buildings", pt: "Limpeza: destrua 50 predios" });
    }

    // Legendary always possible
    pool.push({ type: "build_any", target: 400, rarity: "legendary", en: "Build 400 blocks", pt: "Construa 400 blocos" });
    pool.push({ type: "destroy_enemy", target: 150, rarity: "legendary", en: "Destroy 150 enemy buildings", pt: "Destrua 150 predios inimigos" });
    pool.push({ type: "research_any", target: 40, rarity: "legendary", en: "Research legend: 40 upgrades", pt: "Lenda da pesquisa: 40 upgrades" });
    pool.push({ type: "install_any", target: 50, rarity: "legendary", en: "Install legend: 50 upgrades", pt: "Lenda da instalacao: 50 installs" });
    pool.push({ type: "wave", target: 50, rarity: "legendary", en: "Survive 50 waves", pt: "Sobreviva a 50 waves" });
    return pool;
}

function globalShopStoreKey(){
    // Shared by ALL teams in this save/campaign
    try{
        if(isCampaign()) return "newtechs-shop-shared-campaign-" + safePart(campaignIdentity());
        return "newtechs-shop-shared-save-" + safePart(saveSessionId());
    }catch(e){ return "newtechs-shop-shared-default"; }
}

function loadGlobalShop(){
    try{
        var raw = Core.settings.getString(globalShopStoreKey(), "");
        if(raw != null && (""+raw).length > 2){
            var data = JSON.parse(""+raw);
            if(data != null) return data;
        }
    }catch(e){}
    try{
        if(Vars.state != null && Vars.state.rules != null && Vars.state.rules.tags != null){
            var t = Vars.state.rules.tags.get("newtechs-shop-shared");
            if(t != null && (""+t).length > 2) return JSON.parse(""+t);
        }
    }catch(e2){}
    return null;
}

function saveGlobalShop(shopData){
    try{
        var s = JSON.stringify(shopData);
        Core.settings.put(globalShopStoreKey(), s);
        if(Vars.state != null && Vars.state.rules != null && Vars.state.rules.tags != null){
            Vars.state.rules.tags.put("newtechs-shop-shared", s);
        }
    }catch(e){}
}


function loadFavorites(){
    try{
        var s = Core.settings.getString(FAVORITES_KEY, "{}");
        favoriteBlocks = JSON.parse(s);
        if(favoriteBlocks == null || typeof favoriteBlocks !== "object") favoriteBlocks = {};
    }catch(e){ favoriteBlocks = {}; }
}
function saveFavorites(){
    try{ Core.settings.put(FAVORITES_KEY, JSON.stringify(favoriteBlocks)); }catch(e){}
}
function isFavoriteBlock(name){
    try{ return favoriteBlocks[""+name] === true; }catch(e){ return false; }
}
function toggleFavoriteBlock(name){
    name = ""+name;
    if(favoriteBlocks[name]) delete favoriteBlocks[name];
    else favoriteBlocks[name] = true;
    saveFavorites();
}

var lastQuietInfoAt = 0;
var lastQuietInfoMsg = "";
function quietInfo(msg){
    try{
        var now = nowMs();
        // Avoid stacking dialogs: skip if same msg within 2.5s or any popup within 0.8s
        if(msg === lastQuietInfoMsg && now - lastQuietInfoAt < 2500) return;
        if(now - lastQuietInfoAt < 800) return;
        lastQuietInfoAt = now;
        lastQuietInfoMsg = msg;
        Vars.ui.showInfoToast(msg, 2.5);
    }catch(e){
        try{ Vars.ui.showInfo(msg); }catch(e2){}
    }
}
function tryGrantDailyBonus(){
    try{
        if(Vars.state == null || !Vars.state.isGame()) return;
        var day = (new Date()).toISOString().substring(0, 10);
        var mode = currentGameModeKey();
        var key;
        if(isCampaign()) key = DAILY_BONUS_KEY + "-campaign-" + day;
        else key = DAILY_BONUS_KEY + "-" + safePart(saveSessionId()) + "-" + day;
        if(safeGetBool(key, false)) return;
        var bonus = 150;
        if(mode === "pvp") bonus = 200;
        if(mode === "sandbox") bonus = 100;
        if(mode === "campaign") bonus = 250;
        addPoints(bonus);
        Core.settings.put(key, true);
        try{ quietInfo(tr("Daily bonus: +" + bonus + " points!", "Bonus diario: +" + bonus + " pontos!")); }catch(eI){}
    }catch(e){}
}

function flashInstallEffect(build){
    try{
        if(build == null || Vars.headless) return;
        installFlashBuilds.push({ x: build.x, y: build.y, size: build.block != null ? build.block.size : 1, life: 45 });
        try{ if(typeof Sounds !== "undefined" && Sounds.message != null) Sounds.message.at(build.x, build.y); }catch(eS){}
    }catch(e){}
}

function countResearchedForGroup(group){
    if(group == null || group.upgrades == null) return 0;
    var n = 0;
    for(var i = 0; i < group.upgrades.length; i++){
        var id = group.upgrades[i];
        if(id == null) continue;
        if((""+id).indexOf("combo-") === 0) continue;
        var u = UPGRADES[id];
        if(u != null && (u.isCombo || u.tier === "combo" || u.tier === "ultimate" || u.tier === "final")) continue;
        if(levelOf(id) > 0) n++;
    }
    return n;
}
function researchRankSum(group){
    if(group == null || group.upgrades == null) return 0;
    var sum = 0;
    for(var i = 0; i < group.upgrades.length; i++){
        var id = group.upgrades[i];
        if((""+id).indexOf("combo-") === 0) continue;
        var u = UPGRADES[id];
        if(u != null && (u.tier === "ultimate" || u.tier === "final" || u.isCombo)) continue;
        sum += levelOf(id)|0;
    }
    return sum;
}

function ensureComboMastery(group){
    if(group == null || group.block == null) return;
    var block = group.block();
    if(block == null) return;
    // Ready when 3 different cards researched OR 3 total ranks (same as COMBO badge)
    var n = countResearchedForGroup(group);
    var sum = researchRankSum(group);
    if(n < 3 && sum < 3) return;
    var id = "combo-" + safePart(block.name);
    if(UPGRADES[id] == null){
        UPGRADES[id] = {
            id: id,
            block: function(){ return block; },
            maxLevel: 1,
            max: 1,
            cost: function(lv){ return [[Items.copper, 200],[Items.lead, 150],[Items.silicon, 80]]; },
            nameEn: block.localizedName + " Mastery",
            namePt: "Maestria " + block.localizedName,
            descEn: "Combo: researched 3+ upgrades. +8% efficiency when installed.",
            descPt: "Combo: pesquisou 3+ upgrades. +8% eficiencia ao instalar.",
            name: function(){ return tr(this.nameEn, this.namePt); },
            desc: function(lv){ return tr(this.descEn, this.descPt); },
            keys: block.name + " combo mastery set",
            boost: 0.08,
            boostEach: 0.08,
            installable: true,
            isCombo: true,
            tier: "combo"
        };
    }
    if(group.upgrades.indexOf(id) < 0) group.upgrades.push(id);
    // Auto-unlock the combo card once (research free) so it appears for install
    if(levelOf(id) <= 0){
        try{
            ensurePersistentState();
            persistentLevels[id] = 1;
            savePersistentState(false);
        }catch(e2){}
    }
}


function ensurePointSystems(){
    ensurePersistentState();
    try{ loadFavorites(); }catch(eF){}
    if(persistentPointMissions == null || !persistentPointMissions.list || persistentPointMissions.mode !== currentGameModeKey()
        || (persistentPointMissions.list.length|0) < 13){
        rollPointMissions();
    }
    var g = loadGlobalShop();
    if(g == null || g.itemSlots == null || g.unitSlots == null){
        rollShopSlots("item", false);
        rollShopSlots("unit", false);
        g = loadGlobalShop();
    }
    persistentShop = g;
    try{
        if(g != null && g.nextRefresh != null && Time.millis() > g.nextRefresh){
            rollShopSlots("item", false);
            rollShopSlots("unit", false);
        }
    }catch(e){}
    try{ tryGrantDailyBonus(); }catch(eD){}
    try{ ensureContracts(); }catch(eCt){}
    try{ loadSpecialization(); }catch(eSp){}
    try{ ensureDailyChallenge(); loadUiPrefs(); loadStreak(); }catch(eDc){}
}

function rollPointMissions(){
    var pool = modeMissionPool();
    var list = [];
    var tries = 0;
    var mode = currentGameModeKey();
    while(list.length < 13 && tries < 120){
        tries++;
        var rarity = rollRarity();
        var sub = [];
        for(var i = 0; i < pool.length; i++){
            if(pool[i].rarity === rarity) sub.push(pool[i]);
        }
        if(sub.length === 0) sub = pool;
        var tmpl = sub[(Math.random()*sub.length)|0];
        var reward = rarityPointsReward(tmpl.rarity);
        if(tmpl.target >= 200) reward = Math.min(700, reward + 80);
        if(tmpl.target >= 100) reward = Math.min(550, reward + 40);
        if(mode === "pvp" && tmpl.type === "destroy_enemy") reward = Math.min(500, reward + 30);
        list.push({
            id: "pm-" + Time.millis() + "-" + list.length + "-" + ((Math.random()*9999)|0),
            type: tmpl.type,
            target: tmpl.target,
            progress: 0,
            rarity: tmpl.rarity,
            reward: reward,
            en: tmpl.en,
            pt: tmpl.pt,
            claimed: false,
            mode: mode
        });
    }
    persistentPointMissions = { list: list, mode: mode };
    try{ savePersistentState(false); }catch(e){}
}

function bumpPointMission(type, amount){
    try{ bumpContract(type, amount); }catch(eC){}
    try{ bumpDailyChallenge(type, amount); }catch(eD){}
    try{ ensurePersistentState(); }catch(eE){}
    if(persistentPointMissions == null || persistentPointMissions.list == null) return;
    amount = amount || 1;
    var list = persistentPointMissions.list;
    var changed = false;
    for(var i = 0; i < list.length; i++){
        var m = list[i];
        if(m == null || m.claimed || m.type !== type) continue;
        m.progress = (m.progress|0) + amount;
        if(m.progress > m.target) m.progress = m.target;
        changed = true;
    }
    if(changed) try{ savePersistentState(false); }catch(e){}
}

function claimPointMission(id){
    if(persistentPointMissions == null || persistentPointMissions.list == null) return false;
    for(var i = 0; i < persistentPointMissions.list.length; i++){
        var m = persistentPointMissions.list[i];
        if(m == null || m.id !== id) continue;
        if(m.claimed) return false;
        if((m.progress|0) < (m.target|0)) return false;
        m.claimed = true;
        addPoints(m.reward|0);
        try{ onMissionClaimedStreak(); }catch(eS){}
        try{ savePersistentState(false); }catch(eP){}
        return true;
    }
    return false;
}

function unitFixedRarity(u){
    var cost = unitTierCost(u);
    if(cost >= 16000) return "legendary";
    if(cost >= 8000) return "epic";
    if(cost >= 3000) return "rare";
    if(cost >= 700) return "uncommon";
    return "common";
}

function pickAnyShopUnit(){
    try{
        var pool = [];
        Vars.content.units().each(function(u){
            if(u == null || u.isHidden()) return;
            try{ if(u.isBanned && u.isBanned()) return; }catch(e){}
            try{ if(!isUnlockedInVanillaResearch(u)) return; }catch(eRes){}
            pool.push(u);
        });
        if(pool.length === 0) return null;
        return pool[(Math.random()*pool.length)|0];
    }catch(e){ return null; }
}

function unitTierCost(u){
    if(u == null) return 500;
    var n = (""+u.name).toLowerCase();
    // Explicit tiers so T5 is never cheaper than T4
    // T5 / bosses
    if(n.indexOf("toxopid") >= 0 || n.indexOf("reign") >= 0 || n.indexOf("omura") >= 0 ||
       n.indexOf("corvus") >= 0 || n.indexOf("conquer") >= 0 || n.indexOf("eclipse") >= 0 ||
       n.indexOf("sei") >= 0 || n.indexOf("navanax") >= 0 || n.indexOf("disrupt") >= 0 ||
       n.indexOf("collaris") >= 0 || n.indexOf("tecta") >= 0 || n.indexOf("anthicus") >= 0) return 22000;
    // T4
    if(n.indexOf("scepter") >= 0 || n.indexOf("quasar") >= 0 || n.indexOf("vela") >= 0 ||
       n.indexOf("antumbra") >= 0 || n.indexOf("aegires") >= 0 || n.indexOf("obviate") >= 0 ||
       n.indexOf("quell") >= 0 || n.indexOf("vanquish") >= 0 || n.indexOf("cleroi") >= 0 ||
       n.indexOf("astrum") >= 0 || n.indexOf("zenith") >= 0 || n.indexOf("arkyid") >= 0) return 12000;
    // T3
    if(n.indexOf("fortress") >= 0 || n.indexOf("spiroct") >= 0 || n.indexOf("zenith") >= 0 ||
       n.indexOf("quad") >= 0 || n.indexOf("bryde") >= 0 || n.indexOf("minke") >= 0 ||
       n.indexOf("poly") >= 0 || n.indexOf("mega") >= 0 || n.indexOf("cyerce") >= 0 ||
       n.indexOf("atrax") >= 0 || n.indexOf("mace") >= 0 || n.indexOf("pulsar") >= 0 ||
       n.indexOf("horizon") >= 0 || n.indexOf("locus") >= 0 || n.indexOf("precept") >= 0 ||
       n.indexOf("merui") >= 0 || n.indexOf("elude") >= 0 || n.indexOf("avert") >= 0) return 4500;
    // T2
    if(n.indexOf("mace") >= 0 || n.indexOf("pulsar") >= 0 || n.indexOf("horizon") >= 0 ||
       n.indexOf("atrax") >= 0 || n.indexOf("poly") >= 0 || n.indexOf("minke") >= 0 ||
       n.indexOf("oxynoe") >= 0 || n.indexOf("stell") >= 0 || n.indexOf("retusa") >= 0) return 1200;
    // T1 / fodder
    if(n.indexOf("crawler") >= 0) return 80;
    if(n.indexOf("dagger") >= 0 || n.indexOf("nova") >= 0 || n.indexOf("flare") >= 0 ||
       n.indexOf("risso") >= 0 || n.indexOf("retusa") >= 0 || n.indexOf("stell") >= 0) return 220;

    // Fallback by health — ordered so higher HP always costs more
    var h = 0;
    try{ h = u.health|0; }catch(e){}
    if(h >= 20000) return 22000;
    if(h >= 12000) return 16000;
    if(h >= 8000) return 12000;
    if(h >= 5000) return 8000;
    if(h >= 3000) return 4500;
    if(h >= 1500) return 2000;
    if(h >= 700) return 900;
    if(h >= 300) return 400;
    return 180;
}

function promoMultiplierForRarity(rarity){
    // Legendary units: no real discount. Epic mild. Lower rarities can sale more.
    if(rarity === "legendary") return 1; // no promo price cut
    if(rarity === "epic") return 0.88 + Math.random() * 0.07; // 88–95%
    if(rarity === "rare") return 0.70 + Math.random() * 0.12; // 70–82%
    if(rarity === "uncommon") return 0.55 + Math.random() * 0.15; // 55–70%
    return 0.45 + Math.random() * 0.20; // common 45–65%
}


function itemShopCost(item, rarity){
    // Cheap bulk resources — cost is per pack (see itemPackAmount)
    var base = 28;
    if(rarity === "uncommon") base = 55;
    if(rarity === "rare") base = 110;
    if(rarity === "epic") base = 220;
    if(rarity === "legendary") base = 420;
    try{
        var n = (""+item.name).toLowerCase();
        if(n === "surge-alloy" || n === "phase-fabric" || n === "carbide") base = Math.max(base, 260);
        if(n === "thorium" || n === "titanium" || n === "tungsten" || n === "oxide") base = Math.max(base, 85);
        if(n === "silicon" || n === "graphite" || n === "metaglass" || n === "plastanium") base = Math.min(base, Math.max(40, base));
        if(n === "copper" || n === "lead" || n === "sand" || n === "coal" || n === "scrap") base = Math.min(base, 22);
    }catch(e){}
    return base;
}

function itemPackAmount(item, rarity){
    // How many items you receive per purchase
    var amt = 280;
    if(rarity === "uncommon") amt = 200;
    if(rarity === "rare") amt = 150;
    if(rarity === "epic") amt = 100;
    if(rarity === "legendary") amt = 70;
    try{
        var n = (""+item.name).toLowerCase();
        if(n === "copper" || n === "lead" || n === "coal" || n === "sand" || n === "scrap") amt = Math.max(amt, 450);
        if(n === "graphite" || n === "silicon" || n === "metaglass") amt = Math.max(amt, 220);
        if(n === "titanium" || n === "thorium" || n === "beryllium") amt = Math.max(amt, 160);
        if(n === "surge-alloy" || n === "phase-fabric" || n === "carbide") amt = Math.min(amt, 80);
    }catch(e){}
    return amt;
}

function pickEssentialShopItem(usedNames){
    // Prioritize useful bulk materials so the shop is not random junk
    var essentials = [
        "copper", "lead", "coal", "sand", "scrap",
        "graphite", "silicon", "metaglass", "titanium", "thorium",
        "plastanium", "phase-fabric", "surge-alloy",
        "beryllium", "tungsten", "oxide", "carbide"
    ];
    // Shuffle lightly by starting at random offset
    var start = (Math.random() * essentials.length)|0;
    for(var k = 0; k < essentials.length; k++){
        var name = essentials[(start + k) % essentials.length];
        try{
            if(usedNames != null && usedNames[name]) continue;
            var it = Vars.content.item(name);
            if(it == null || it.isHidden()) continue;
            try{ if(!isUnlockedInVanillaResearch(it)) continue; }catch(eR){}
            try{ if(!itemOnCurrentPlanet(it)) continue; }catch(eP){}
            return it;
        }catch(e){}
    }
    return null;
}

function itemOnCurrentPlanet(it){
    if(it == null) return false;
    var p = null;
    try{ p = currentPlanetObject(); }catch(e){}
    // No planet / sun / custom => all items
    if(p == null || isSunPlanet(p)) return true;
    try{
        var pn = ("" + p.name).toLowerCase();
        if(pn === "" || pn === "custom") return true;
    }catch(e0){}
    try{
        var planets = it.shownPlanets;
        if(planets == null || planets.size <= 0){
            // Fallback by known names when shownPlanets empty
            var n = (""+it.name).toLowerCase();
            var pn2 = (""+p.name).toLowerCase();
            if(pn2.indexOf("erekir") >= 0){
                if(n === "copper" || n === "lead" || n === "titanium" || n === "thorium" || n === "plastanium" || n === "phase-fabric" || n === "metaglass" || n === "spore-pod" || n === "pyratite" || n === "blast-compound") return false;
            }
            if(pn2.indexOf("serpulo") >= 0){
                if(n === "beryllium" || n === "tungsten" || n === "oxide" || n === "carbide" || n === "fissile-matter" || n === "dormant-cyst") return false;
            }
            return true;
        }
        if(planets.contains(p)) return true;
        try{
            var it2 = planets.iterator();
            while(it2.hasNext()){
                var sp = it2.next();
                if(isSunPlanet(sp)) return true;
            }
        }catch(eIt){}
        return false;
    }catch(e){}
    return true;
}

function defaultStock(rarity, kind){
    if(kind === "unit"){
        // Units: moderate stock (still scarcer than resources)
        if(rarity === "legendary") return 2 + ((Math.random()*2)|0);      // 2-3
        if(rarity === "epic") return 3 + ((Math.random()*3)|0);           // 3-5
        if(rarity === "rare") return 5 + ((Math.random()*3)|0);            // 5-7
        if(rarity === "uncommon") return 7 + ((Math.random()*4)|0);        // 7-10
        return 9 + ((Math.random()*5)|0);                                 // 9-13 common
    }
    // Items/resources: generous stock (packs sell often)
    if(rarity === "legendary") return 10 + ((Math.random()*8)|0);         // 10-17
    if(rarity === "epic") return 18 + ((Math.random()*12)|0);             // 18-29
    if(rarity === "rare") return 30 + ((Math.random()*20)|0);             // 30-49
    if(rarity === "uncommon") return 45 + ((Math.random()*30)|0);         // 45-74
    return 70 + ((Math.random()*50)|0);                                   // 70-119 common
}

function rollShopSlots(kind, paid){
    // kind: "item" | "unit" — up to 10 slots, some may be empty
    var g = loadGlobalShop();
    if(g == null) g = { itemSlots: [], unitSlots: [], nextRefresh: Time.millis() + 20*60*1000, rolledAt: Time.millis() };

    var slots = [];
    // Resources fill more slots; units a bit fewer empties
    var count = kind === "item" ? (8 + ((Math.random()*3)|0)) : (6 + ((Math.random()*5)|0)); // items 8-10, units 6-10
    if(count > 10) count = 10;
    var usedNames = {};
    for(var i = 0; i < 10; i++){
        if(i >= count){
            slots.push(null); // empty slot
            continue;
        }
        if(kind === "unit"){
            // Units: no planet filter, but NO duplicates
            var unit = pickShopUnitUnique(usedNames);
            if(unit == null){ slots.push(null); continue; }
            usedNames[""+unit.name] = true;
            var rarity = unitFixedRarity(unit);
            var ust = defaultStock(rarity, "unit");
            var baseU = unitTierCost(unit);
            var upromo = false;
            var upromoMult = 1;
            var ucost = baseU;
            // Units: only common–rare can go on sale; epic rare mild; legendary never
            if(rarity !== "legendary" && Math.random() < 0.18){
                upromoMult = promoMultiplierForRarity(rarity);
                if(upromoMult < 0.999){
                    upromo = true;
                    ucost = Math.max(50, Math.floor(baseU * upromoMult));
                }
            }
            slots.push({
                kind: "unit",
                name: ""+unit.name,
                rarity: rarity,
                cost: ucost,
                baseCost: baseU,
                stock: ust,
                maxStock: ust,
                promo: upromo,
                promoMult: upromo ? upromoMult : 1
            });
        }else{
            // Items: smarter picks — essentials first, then weighted rarity
            var rarity = (i < 4) ? "common" : (i < 7 ? (Math.random() < 0.55 ? "common" : "uncommon") : rollRarity());
            var item = null;
            if(i < 5){
                item = pickEssentialShopItem(usedNames);
            }
            if(item == null) item = pickShopItem(rarity, usedNames);
            if(item == null){ slots.push(null); continue; }
            usedNames[""+item.name] = true;
            // Re-evaluate rarity from item hardness for fair pricing
            try{
                var hard = item.hardness|0;
                if(hard <= 0) rarity = "common";
                else if(hard === 1) rarity = Math.random() < 0.7 ? "common" : "uncommon";
                else if(hard === 2) rarity = Math.random() < 0.5 ? "uncommon" : "rare";
                else if(hard === 3) rarity = Math.random() < 0.55 ? "rare" : "epic";
                else rarity = Math.random() < 0.6 ? "epic" : "legendary";
            }catch(eH){}
            var amt = itemPackAmount(item, rarity);
            var st = defaultStock(rarity, "item");
            // Basics get even more stock
            try{
                var ln = (""+item.name).toLowerCase();
                if(ln === "copper" || ln === "lead" || ln === "coal" || ln === "sand" || ln === "scrap"){
                    st = Math.max(st, 90 + ((Math.random()*40)|0));
                    amt = Math.max(amt, 400);
                }
                if(ln === "graphite" || ln === "silicon" || ln === "metaglass"){
                    st = Math.max(st, 60 + ((Math.random()*30)|0));
                    amt = Math.max(amt, 220);
                }
            }catch(eB){}
            var baseCost = itemShopCost(item, rarity);
            var promo = Math.random() < 0.32;
            var promoMult = 1;
            var cost = baseCost;
            if(promo){
                promoMult = promoMultiplierForRarity(rarity);
                if(promoMult >= 0.999) promo = false;
                else cost = Math.max(4, Math.floor(baseCost * promoMult));
            }
            slots.push({
                kind: "item",
                name: ""+item.name,
                amount: amt,
                rarity: rarity,
                cost: cost,
                baseCost: baseCost,
                stock: st,
                maxStock: st,
                promo: promo,
                promoMult: promo ? promoMult : 1
            });
        }
    }
    if(kind === "unit") g.unitSlots = slots;
    else g.itemSlots = slots;
    try{
        var best = -1, bestScore = -1;
        for(var fi = 0; fi < slots.length; fi++){
            var fs = slots[fi];
            if(fs == null) continue;
            var score = (fs.promo ? 5 : 0) + (fs.rarity === "legendary" ? 4 : fs.rarity === "epic" ? 3 : fs.rarity === "rare" ? 2 : 1) + Math.random();
            if(score > bestScore){ bestScore = score; best = fi; }
        }
        if(kind === "item") g.featuredItem = best; else g.featuredUnit = best;
        if(best >= 0 && slots[best] != null && !slots[best].promo){
            var bs = slots[best];
            // Never deep-discount legendary (especially units)
            if(bs.rarity === "legendary"){
                // featured highlight only — no price cut
            }else{
                var mult = promoMultiplierForRarity(bs.rarity || "common");
                if(mult < 0.999){
                    bs.promo = true;
                    if(bs.baseCost == null) bs.baseCost = bs.cost|0;
                    bs.promoMult = mult;
                    bs.cost = Math.max(10, Math.floor((bs.baseCost|0) * mult));
                }
            }
        }
    }catch(eF){}
    g.nextRefresh = nowMs() + 20 * 60 * 1000;
    g.rolledAt = Time.millis();
    saveGlobalShop(g);
    persistentShop = g;
}


function isUnlockedInVanillaResearch(content){
    if(content == null) return false;
    try{ if(!isCampaign()) return true; }catch(e0){ return true; }
    try{
        if(Vars.state != null && Vars.state.rules != null){
            if(Vars.state.rules.infiniteResources) return true;
            if(Vars.state.rules.pvp) return true;
            // Campaign with tech tree disabled → everything available
            try{ if(Vars.state.rules.techUnlocks === false) return true; }catch(eT){}
        }
    }catch(e1){}
    try{ if(content.alwaysUnlocked === true) return true; }catch(eA){}
    // Mindustry unlock checks (order matters)
    try{ if(typeof content.unlockedNow === "function" && content.unlockedNow()) return true; }catch(eN){}
    try{ if(typeof content.unlockedHost === "function" && content.unlockedHost()) return true; }catch(eH){}
    try{ if(typeof content.unlocked === "function" && content.unlocked()) return true; }catch(e2){}
    try{ if(content.unlocked === true) return true; }catch(e3){}
    // Some builds expose database unlocked via isHidden + unlocked()
    try{
        if(typeof content.locked === "function" && !content.locked()){
            // locked() false is not enough alone in campaign; only trust with unlocked()
        }
    }catch(eL){}
    return false;
}

function pickShopItem(rarity, usedNames){
    try{
        var pool = [];
        Vars.content.items().each(function(it){
            if(it == null || it.isHidden()) return;
            try{ if(!isUnlockedInVanillaResearch(it)) return; }catch(eRes){}
            try{ if(!itemOnCurrentPlanet(it)) return; }catch(eP){}
            try{
                if(usedNames != null && usedNames[""+it.name]) return;
            }catch(eU){}
            var hard = 0;
            try{ hard = it.hardness|0; }catch(e){}
            if(rarity === "common" && hard > 1) return;
            if(rarity === "uncommon" && hard > 2) return;
            if(rarity === "legendary" && hard < 2) return;
            pool.push(it);
        });
        if(pool.length === 0){
            // Relax rarity hardness if planet filter emptied pool
            Vars.content.items().each(function(it){
                if(it == null || it.isHidden()) return;
                try{ if(!itemOnCurrentPlanet(it)) return; }catch(eP2){}
                try{ if(usedNames != null && usedNames[""+it.name]) return; }catch(eU2){}
                pool.push(it);
            });
        }
        if(pool.length === 0) return null;
        return pool[(Math.random()*pool.length)|0];
    }catch(e){ return null; }
}

function pickShopUnitUnique(usedNames){
    try{
        var pool = [];
        Vars.content.units().each(function(u){
            if(u == null || u.isHidden()) return;
            try{ if(u.isBanned && u.isBanned()) return; }catch(e){}
            try{ if(!isUnlockedInVanillaResearch(u)) return; }catch(eRes){}
            try{ if(usedNames != null && usedNames[""+u.name]) return; }catch(eU){}
            pool.push(u);
        });
        if(pool.length === 0) return null;
        return pool[(Math.random()*pool.length)|0];
    }catch(e){ return null; }
}

function pickShopUnit(rarity){
    try{
        var pool = [];
        Vars.content.units().each(function(u){
            if(u == null || u.isHidden()) return;
            try{ if(u.isBanned && u.isBanned()) return; }catch(e){}
            var cost = unitTierCost(u);
            if(rarity === "common" && cost > 400) return;
            if(rarity === "uncommon" && (cost < 200 || cost > 1200)) return;
            if(rarity === "rare" && (cost < 600 || cost > 5000)) return;
            if(rarity === "epic" && (cost < 2000 || cost > 9000)) return;
            if(rarity === "legendary" && cost < 5000) return;
            pool.push(u);
        });
        if(pool.length === 0) return null;
        return pool[(Math.random()*pool.length)|0];
    }catch(e){ return null; }
}


function giveItemsToPlayerTeam(item, amount){
    if(item == null || amount <= 0) return false;
    try{
        if(Vars.player == null) return false;
        var team = Vars.player.team();
        // Prefer player closest core
        var core = null;
        try{ core = Vars.player.core(); }catch(e0){}
        if(core == null && team != null){
            try{ core = team.core(); }catch(e1){}
        }
        if(core != null && core.items != null){
            try{ core.items.add(item, amount); return true; }catch(e2){}
            try{ core.handleStack(item, amount, Vars.player.unit()); return true; }catch(e3){}
        }
        // All team cores
        var cores = researchCores();
        for(var i = 0; i < cores.length; i++){
            var c = cores[i];
            if(c == null || c.items == null) continue;
            try{ c.items.add(item, amount); return true; }catch(e4){}
            try{ c.handleStack(item, amount, null); return true; }catch(e5){}
        }
        // Team item pool (some versions)
        try{
            if(team != null && team.items != null){
                team.items.add(item, amount);
                return true;
            }
        }catch(e6){}
    }catch(e){ Log.err("New Tech's giveItems: " + e); }
    return false;
}

function buyShopSlot(kind, index){
    ensurePointSystems();
    var g = loadGlobalShop();
    if(g == null) return false;
    var slots = kind === "unit" ? g.unitSlots : g.itemSlots;
    if(slots == null) return false;
    var slot = slots[index];
    if(slot == null) return false;
    if((slot.stock|0) <= 0){
        quietInfo(tr("Out of stock.", "Fora de estoque."));
        return false;
    }
    var cost = slot.cost|0;
    if(!spendPoints(cost)){
        quietInfo(tr("Not enough points.", "Pontos insuficientes."));
        return false;
    }

    // Clients cannot spawn units / add core items — host must fulfill
    try{
        if(shopUsesHostRelay()){
            if(!shopClientsAllowed()){
                quietInfo(tr("Host disabled shop for clients.", "Host desativou a loja para clients."));
                return false;
            }
            var payload = JSON.stringify({
                op: "buy",
                kind: kind === "unit" ? "unit" : "item",
                index: index|0,
                name: slot.name,
                amount: slot.amount|0,
                cost: cost
            });
            Call.serverPacketReliable("newtechs-shop", payload);
            slot.stock = Math.max(0, (slot.stock|0) - 1);
            return true;
        }
    }catch(eNet){}

    // Host / singleplayer
    if(slot.kind === "item"){
        var item = Vars.content.item(slot.name);
        if(item == null){ addPoints(cost); return false; }
        var amt = slot.amount|0;
        if(amt <= 0) amt = 1;
        if(!giveItemsToPlayerTeam(item, amt)){
            addPoints(cost);
            Vars.ui.showInfo(tr("No core to receive items.", "Sem nucleo para receber itens."));
            return false;
        }
    }else if(slot.kind === "unit"){
        var ut = Vars.content.unit(slot.name);
        if(ut == null){ addPoints(cost); return false; }
        var ok = spawnUnitSafely(ut);
        if(!ok){ addPoints(cost); Vars.ui.showInfo(tr("Could not find a safe spawn near you.", "Nao foi possivel achar spawn seguro.")); return false; }
    }else{
        addPoints(cost);
        return false;
    }
    slot.stock = Math.max(0, (slot.stock|0) - 1);
    saveGlobalShop(g);
    persistentShop = g;
    return true;
}

function spawnUnitSafely(unitType){
    try{
        if(Vars.player == null || unitType == null) return false;
        var team = Vars.player.team();
        if(team == null) return false;
        var px = Vars.player.x;
        var py = Vars.player.y;
        var bestX = px, bestY = py;
        var best = null;
        var bestScore = -1e9;
        for(var r = 0; r <= 20; r++){
            for(var dx = -r; dx <= r; dx++){
                for(var dy = -r; dy <= r; dy++){
                    if(r > 0 && Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                    var tx = (px / 8 + dx)|0;
                    var ty = (py / 8 + dy)|0;
                    var tile = Vars.world.tile(tx, ty);
                    if(tile == null) continue;
                    try{ if(tile.solid()) continue; }catch(eSol){}
                    try{ if(tile.floor() != null && tile.floor().isDeep()) continue; }catch(eD){}
                    var score = 100 - (Math.abs(dx)+Math.abs(dy));
                    try{
                        if(tile.build != null && tile.build.team === team) score += 30;
                        if(tile.floor() != null && tile.floor().isLiquid) score -= 40;
                    }catch(eS){}
                    if(score > bestScore){
                        bestScore = score;
                        best = tile;
                        bestX = tile.worldx();
                        bestY = tile.worldy();
                    }
                }
            }
            if(best != null && bestScore >= 90) break;
        }
        if(best == null){
            try{
                var core = team.core();
                if(core != null){ bestX = core.x; bestY = core.y; }
            }catch(eC){}
        }
        // Try several spawn APIs (version differences)
        var unit = null;
        try{ unit = unitType.spawn(team, bestX, bestY); }catch(e1){}
        if(unit == null){
            try{
                unit = unitType.create(team);
                if(unit != null){
                    unit.set(bestX, bestY);
                    unit.add();
                }
            }catch(e2){}
        }
        if(unit == null){
            try{
                unit = unitType.create(team);
                if(unit != null){
                    unit.x = bestX; unit.y = bestY;
                    unit.add();
                }
            }catch(e3){}
        }
        if(unit == null){
            try{
                // Core spawn as last resort
                var c2 = team.core();
                if(c2 != null) unit = unitType.spawn(team, c2.x, c2.y);
            }catch(e4){}
        }
        return unit != null;
    }catch(e){
        Log.err("New Tech's unit spawn: " + e);
        return false;
    }
}

function shopRefreshCost(g){
    // Closer to auto-refresh = cheaper (1200 full → 100 near refresh)
    try{
        var now = nowMs();
        var next = g != null ? Number(g.nextRefresh) : 0;
        var full = 20 * 60 * 1000;
        if(!isFinite(next) || next <= 0) return 1200;
        var left = Math.max(0, next - now);
        var frac = Math.min(1, left / full);
        // At start of cycle: ~1200; near end: ~100
        return Math.max(100, Math.min(1200, Math.floor(100 + frac * 1100)));
    }catch(e){ return 1200; }
}
function showPointMissionsDialog(){
    ensurePointSystems();
    var dialog = new BaseDialog(tr("Point Missions", "Missões de Pontos"));
    var body = new Table();
    body.defaults().growX().pad(4);
    var mode = currentGameModeKey();
    body.add("[accent]" + tr("Points: ", "Pontos: ") + (persistentPoints|0)).row();
    body.table(Tex.pane, function(tip){
        tip.left().defaults().left().pad(4);
        tip.add("[accent]" + tr("Missions tutorial", "Tutorial de missoes")).row();
        tip.add("[white]" + tr("Complete goals (build, deposit items, destroy enemies, etc.) to fill the bar.", "Cumpra metas (construir, depositar itens, destruir inimigos, etc.) para encher a barra.")).wrap().row();
        tip.add("[white]" + tr("When a mission is full, press Claim to receive points.", "Quando a missao estiver completa, aperte Coletar para receber os pontos.")).wrap().row();
        tip.add("[white]" + tr("Claim 3 missions in a row for a streak bonus.", "Colete 3 missoes seguidas para um bonus de sequencia.")).wrap().row();
        tip.add("[gray]" + tr("Mission list can be rerolled after you claim the current ones.", "A lista pode ser trocada depois de coletar as atuais.")).wrap().row();
    }).growX().padBottom(6).row();
    body.add("[lightgray]" + tr("Mode: ", "Modo: ") + mode.toUpperCase()).wrap().row();
    body.add("[gray]" + tr("Harder missions pay more (100–2000).", "Missões mais difíceis pagam mais (100–2000).")).wrap().row();

    var list = (persistentPointMissions && persistentPointMissions.list) ? persistentPointMissions.list : [];
    for(var i = 0; i < list.length; i++){
        (function(m){
            var frac = m.target > 0 ? Math.min(1, (m.progress|0) / (m.target|0)) : 0;
            var col = RARITY_COLOR[m.rarity] || "[white]";
            body.table(Tex.pane, function(tbl){
                try{ ntFadeIn(tbl, 0.04 * i); }catch(eAnM){}
                tbl.left().defaults().left().pad(3);
                tbl.add(col + (m.rarity || "").toUpperCase() + "[] — " + tr(m.en, m.pt)).growX().wrap().row();
                tbl.add(progressBarText(frac, (m.progress|0) >= (m.target|0)) + " [lightgray]" + (m.progress|0) + "/" + (m.target|0)).row();
                tbl.add("[#ffd54f]" + tr("Reward: ", "Recompensa: ") + (m.reward|0) + " " + tr("pts", "pts")).row();
                if(m.claimed){
                    tbl.add("[lime]" + tr("Claimed", "Resgatado")).row();
                }else{
                    tbl.button(tr("Claim", "Resgatar"), function(){
                        if(claimPointMission(m.id)){
                            dialog.hide();
                            showPointMissionsDialog();
                        }else{
                            quietInfo(tr("Mission not complete yet.", "Missão ainda incompleta."));
                        }
                    }).disabled((m.progress|0) < (m.target|0)).size(120, 40).padTop(2);
                }
            }).growX().row();
        })(list[i]);
    }
    body.button(tr("Reroll missions (when all claimed)", "Sortear missões (quando todas resgatadas)"), function(){
        var allClaimed = true;
        for(var j = 0; j < list.length; j++) if(list[j] && !list[j].claimed) allClaimed = false;
        if(!allClaimed && list.length > 0){
            Vars.ui.showInfo(tr("Finish or claim current missions first.", "Termine ou resgate as missões atuais primeiro."));
            return;
        }
        rollPointMissions();
        dialog.hide();
        showPointMissionsDialog();
    }).size(Vars.mobile ? 280 : 300, 42).padTop(6).row();

    dialog.addCloseButton();
    dialog.cont.pane(body).grow().pad(8);
    dialog.show();
}

function ntFadeIn(element, delay){
    try{
        if(element == null) return;
        if(!fxEnabled()){ try{ element.color.a = 1; }catch(e0){} return; }
        var Actions = Packages.arc.scene.actions.Actions;
        element.color.a = 0;
        element.actions(Actions.sequence(
            Actions.delay(Math.min(delay || 0, 0.05)),
            Actions.fadeIn(0.22)
        ));
    }catch(e){
        try{ element.color.a = 1; }catch(e2){}
    }
}
function ntPulse(element){
    try{
        if(element == null || !fxEnabled()) return;
        var Actions = Packages.arc.scene.actions.Actions;
        try{ element.setOrigin(1); }catch(eO){}
        element.actions(Actions.forever(Actions.sequence(
            Actions.scaleTo(1.02, 1.02, 0.55),
            Actions.scaleTo(1.0, 1.0, 0.55)
        )));
    }catch(e){}
}
function ntSlideIn(element, delay){
    try{
        if(element == null) return;
        if(!fxEnabled()){ try{ element.color.a = 1; }catch(e0){} return; }
        var Actions = Packages.arc.scene.actions.Actions;
        element.color.a = 0;
        element.actions(Actions.sequence(
            Actions.delay(delay || 0),
            Actions.parallel(
                Actions.fadeIn(0.18),
                Actions.moveBy(0, -6, 0.18)
            )
        ));
    }catch(e){
        try{ ntFadeIn(element, delay); }catch(e2){}
    }
}
function showPointShopDialog(kind){
    if(kind !== "unit") kind = "item";
    ensurePointSystems();
    var title = kind === "unit"
        ? tr("Unit Shop", "Loja de Unidades")
        : tr("Item Shop", "Loja de Recursos");
    var dialog = new BaseDialog(title);
    var body = new Table();
    body.defaults().growX().pad(4);
    body.add("[accent]" + tr("Points: ", "Pontos: ") + (persistentPoints|0)).row();
    body.table(Tex.pane, function(tip){
        tip.left().defaults().left().pad(4);
        tip.add("[accent]" + tr("Shop tutorial", "Tutorial da loja")).row();
        tip.add("[white]" + tr("Spend the points you earned from missions and contracts.", "Gaste os pontos que voce ganhou em missoes e contratos.")).wrap().row();
        tip.add("[white]" + tr("Items go to your team cores. Units spawn near you in a safe spot.", "Itens vao para os nucleos do time. Unidades nascem perto de voce em local seguro.")).wrap().row();
        tip.add("[white]" + tr("Orange PROMOTION tags mean a lower price. Stock is limited.", "A etiqueta laranja PROMOCAO significa preco menor. O estoque e limitado.")).wrap().row();
        tip.add("[gray]" + tr("Shop is shared on the server. It refreshes about every 20 minutes.", "A loja e compartilhada no servidor. Atualiza cerca de a cada 20 minutos.")).wrap().row();
    }).growX().padBottom(6).row();
    try{
        var mode = currentGameModeKey();
        if(isWorldAuthority()){
            body.add("[#81c784]" + tr("Mode: " + mode + " — instant buy (host/offline).", "Modo: " + mode + " — compra instantanea (host/offline).")).wrap().padBottom(2).row();
        }else if(modeAllowsFreeShopUi()){
            body.add("[#81c784]" + tr("Mode: " + mode + " — buy to host, no extra confirm.", "Modo: " + mode + " — compra no host, sem confirm extra.")).wrap().padBottom(2).row();
        }else{
            body.add("[#81c784]" + tr("Multiplayer: host delivers to your core / near you.", "Multiplayer: host entrega no nucleo / perto de voce.")).wrap().padBottom(2).row();
        }
    }catch(eM){}

    var g = loadGlobalShop();
    try{
        var featIdx = kind === "unit" ? g.featuredUnit : g.featuredItem;
        var slotsF = kind === "unit" ? g.unitSlots : g.itemSlots;
        if(featIdx != null && featIdx >= 0 && slotsF != null && slotsF[featIdx] != null){
            var fs = slotsF[featIdx];
            var leftSec = 0;
            try{
                if(g != null && g.nextRefresh != null){
                    leftSec = Math.max(0, Math.floor((Number(g.nextRefresh) - nowMs()) / 1000));
                }
            }catch(eT){}
            var mm = (leftSec / 60)|0;
            var ss = leftSec % 60;
            body.table(Tex.button, function(card){
                card.center().defaults().center().pad(4);
                try{ ntPulse(card); }catch(eP){}
                card.add("[#ffd54f]" + tr("★ FEATURED SHOWCASE", "★ VITRINE")).row();
                var nm = fs.name;
                try{
                    if(kind === "unit"){ var u = Vars.content.unit(fs.name); if(u){ nm = u.localizedName; try{ card.image(u.uiIcon).size(48).pad(2); }catch(eU){} } }
                    else { var it = Vars.content.item(fs.name); if(it){ nm = it.localizedName; try{ card.image(it.uiIcon).size(48).pad(2); }catch(eI){} } }
                }catch(eN){}
                card.row();
                if(fs.promo){
                    card.add("[#ff6e40]◆ " + tr("PROMOTION", "PROMOÇÃO") + " ◆").row();
                    card.add("[accent]" + nm).row();
                    var fbase = fs.baseCost != null ? (fs.baseCost|0) : (fs.cost|0);
                    card.add("[gray]~~ " + fbase + " ~~  [#ff6e40]" + (fs.cost|0) + " pts").padTop(2).row();
                }else{
                    card.add("[accent]" + nm).row();
                    card.add("[#ffd54f]" + (fs.cost|0) + " pts").padTop(2).row();
                }
                card.add("[lightgray]" + tr("Stock ", "Estoque ") + (fs.stock|0) + "  •  " + tr("Refresh in ", "Troca em ") + mm + ":" + (ss < 10 ? "0" : "") + ss).row();
                card.button(tr("Buy featured", "Comprar vitrine"), function(){
                    buyShopSlot(kind, featIdx);
                    dialog.hide();
                    showPointShopDialog(kind);
                }).size(180, 44).padTop(4);
            }).growX().padBottom(8).row();
        }
    }catch(eFeat){}

    var leftMin = 0;
    try{
        if(g != null && g.nextRefresh != null){
            leftMin = Math.max(0, Math.ceil((Number(g.nextRefresh) - nowMs()) / 60000));
        }
    }catch(e){}
    var leftSec2 = Math.max(0, leftMin * 60);
    try{ if(g != null && g.nextRefresh != null) leftSec2 = Math.max(0, Math.floor((Number(g.nextRefresh) - nowMs()) / 1000)); }catch(eL){}
    var mm2 = (leftSec2 / 60)|0; var ss2 = leftSec2 % 60;
    body.add("[lightgray]" + tr("Next auto refresh: ", "Proxima troca auto: ") + mm2 + ":" + (ss2 < 10 ? "0" : "") + ss2).row();

    var refreshCost = shopRefreshCost(g);
    body.add("[gray]" + tr("Reroll is cheaper near auto-refresh.", "Reroll fica mais barato perto da troca auto.")).wrap().row();
    body.button(tr("Refresh shop (", "Atualizar loja (") + refreshCost + " pts)", function(){
        var costNow = shopRefreshCost(loadGlobalShop());
        if(!spendPoints(costNow)){
            quietInfo(tr("Not enough points.", "Pontos insuficientes."));
            return;
        }
        rollShopSlots(kind, true);
        dialog.hide();
        showPointShopDialog(kind);
    }).size(Vars.mobile ? 260 : 280, 42).padBottom(6).row();

    var slots = [];
    if(g != null) slots = kind === "unit" ? (g.unitSlots || []) : (g.itemSlots || []);

    for(var i = 0; i < 10; i++){
        (function(slot, index){
            body.table(slot != null && slot.promo ? Tex.button : Tex.pane, function(tbl){
                try{ if(fxEnabled()) ntFadeIn(tbl, 0.03 * Math.min(index, 6)); }catch(eA){}
                // Light pulse on promotions only (cheap alpha pulse)
                try{
                    if(slot != null && slot.promo && fxEnabled()){
                        tbl.actions(Actions.forever(Actions.sequence(
                            Actions.alpha(0.82, 0.55),
                            Actions.alpha(1, 0.55)
                        )));
                    }
                }catch(ePulse){}
                tbl.left().defaults().left().pad(3);
                if(slot == null){
                    tbl.add("[gray]" + tr("Empty slot", "Slot vazio")).growX().row();
                    return;
                }
                var col = RARITY_COLOR[slot.rarity] || "[white]";
                var titleLine = "?";
                var iconDrawable = null;
                if(slot.kind === "item"){
                    var it = Vars.content.item(slot.name);
                    titleLine = (it != null ? it.localizedName : slot.name) + " x" + (slot.amount|0);
                    try{ if(it != null && it.uiIcon != null) iconDrawable = it.uiIcon; }catch(eI){}
                }else{
                    var ut = Vars.content.unit(slot.name);
                    titleLine = tr("Unit: ", "Unidade: ") + (ut != null ? ut.localizedName : slot.name);
                    try{ if(ut != null && ut.uiIcon != null) iconDrawable = ut.uiIcon; }catch(eU){}
                }
                tbl.table(Styles.none, function(row){
                    if(iconDrawable != null){
                        try{ row.image(iconDrawable).size(36).padRight(6); }catch(eImg){}
                    }
                    row.add(col + (slot.rarity||"").toUpperCase() + "[] — " + titleLine).growX().wrap();
                }).growX().row();
                if(slot.promo){
                    tbl.add("[#ff6e40]◆ " + tr("PROMOTION", "PROMOÇÃO") + " ◆").row();
                    var base = slot.baseCost != null ? (slot.baseCost|0) : Math.max((slot.cost|0)+1, Math.floor((slot.cost|0)/0.7));
                    tbl.add("[gray]~~ " + base + " ~~  [#ff6e40]" + (slot.cost|0) + " " + tr("pts", "pts")).row();
                }else{
                    tbl.add("[#ffd54f]" + (slot.cost|0) + " " + tr("pts", "pts")).row();
                }
                tbl.add("[lightgray]" + tr("Stock: ", "Estoque: ") + (slot.stock|0) + "/" + (slot.maxStock|0)).row();
                if((slot.stock|0) <= 0){
                    tbl.add("[scarlet]" + tr("OUT OF STOCK", "FORA DE ESTOQUE")).row();
                }else{
                    tbl.button(tr("Buy", "Comprar"), function(){
                        buyShopSlot(kind, index);
                        dialog.hide();
                        showPointShopDialog(kind);
                    }).size(110, 40).padTop(2);
                }
            }).growX().row();
        })(slots[i] || null, i);
    }

    dialog.addCloseButton();
    dialog.cont.pane(body).grow().pad(8);
    dialog.show();
}

// ---- Event hooks for missions ----
Events.on(BlockBuildEndEvent, function(e){
    try{
        if(e == null || e.breaking) return;
        if(Vars.player == null) return;
        if(e.team != null && e.team !== Vars.player.team()) return;
        var block = e.tile != null ? e.tile.block() : null;
        if(block == null && e.tile != null && e.tile.build != null) block = e.tile.build.block;
        if(block == null) return;
        bumpMasterMission("build", ""+block.name, 1);
        bumpPointMission("build_any", 1);
    }catch(err){}
});

Events.on(BlockDestroyEvent, function(e){
    try{
        if(e == null || e.tile == null || e.tile.build == null) return;
        if(Vars.player == null) return;
        if(e.tile.build.team === Vars.player.team()) return;
        bumpPointMission("destroy_enemy", 1);
    }catch(err){}
});

Events.on(UnitCreateEvent, function(e){
    try{
        if(e == null || e.unit == null) return;
        if(Vars.player == null) return;
        if(e.unit.team !== Vars.player.team()) return;
        bumpPointMission("units_built", 1);
    }catch(err){}
});

Events.on(WaveEvent, function(e){
    try{ bumpPointMission("wave", 1); }catch(err){}
});

// Core deposit missions — track real deposits into cores
Events.on(DepositEvent, function(e){
    try{
        if(e == null) return;
        if(Vars.player == null) return;
        var amount = 0;
        try{ amount = e.amount|0; }catch(eA){ amount = 0; }
        if(amount <= 0) return;
        var build = null;
        try{ build = e.tile != null ? e.tile.build : null; }catch(eB){}
        if(build == null) try{ build = e.building; }catch(eB2){}
        if(build == null) return;
        try{ if(build.team !== Vars.player.team()) return; }catch(eT){ return; }
        var isCore = false;
        try{ if(build.block != null && build.block instanceof CoreBlock) isCore = true; }catch(eC){}
        if(!isCore){
            try{
                var bn = (""+build.block.name).toLowerCase();
                if(bn.indexOf("core-") === 0 || bn.indexOf("core") >= 0) isCore = true;
            }catch(eN){}
        }
        if(!isCore) return;
        bumpPointMission("core_items", amount);
    }catch(err){}
});

// Water mission + core deposit tracking (heavily throttled for FPS)
var lastMissionScanTick = 0;
var lastCoreItemsTotal = -1;
var missionScanPhase = 0;

function totalCoreItemsForTeam(){
    var total = 0;
    try{
        var cores = researchCores();
        for(var i = 0; i < cores.length; i++){
            var c = cores[i];
            if(c == null || c.items == null) continue;
            var got = false;
            try{
                if(typeof c.items.total === "function"){
                    total += (c.items.total()|0);
                    got = true;
                }
            }catch(eT0){}
            if(!got){
                try{
                    // ItemModule.total field on some versions
                    var tf = c.items.total;
                    if(typeof tf === "number"){ total += tf|0; got = true; }
                }catch(eT1){}
            }
            if(!got){
                try{
                    c.items.each(function(item, amount){ total += amount|0; });
                    got = true;
                }catch(eEach){}
            }
            if(!got){
                try{
                    // Fallback: sum by content items
                    Vars.content.items().each(function(it){
                        try{ total += c.items.get(it)|0; }catch(eG){}
                    });
                }catch(eF){}
            }
        }
        // Also team item pool if cores empty
        if(total === 0 && Vars.player != null && Vars.player.team() != null){
            try{
                var ti = Vars.player.team().items();
                if(ti != null && typeof ti.total === "function") total = ti.total()|0;
            }catch(eTeam){}
        }
    }catch(e){}
    return total;
}

function anyOpenWaterMission(){
    try{
        var ids = Object.keys(MASTER_UPGRADES);
        for(var i = 0; i < ids.length; i++){
            var u = MASTER_UPGRADES[ids[i]];
            if(u == null || u.mission == null || u.mission.type !== "water") continue;
            if(!isMasterMissionComplete(u.id)) return true;
        }
    }catch(e){}
    return false;
}

Events.run(Trigger.update, function(){
    try{
        if(Vars.state == null || !Vars.state.isGame()) return;
        if(Vars.player == null) return;
        // ~ every 5 seconds only
        if(Time.time - lastMissionScanTick < 90) return;
        lastMissionScanTick = Time.time;
        missionScanPhase = (missionScanPhase + 1) % 2;

        // Phase 0: core items only
        if(missionScanPhase === 0){
            try{
                var total = totalCoreItemsForTeam();
                if(lastCoreItemsTotal >= 0 && total > lastCoreItemsTotal){
                    bumpPointMission("core_items", total - lastCoreItemsTotal);
                }
                lastCoreItemsTotal = total;
            }catch(eCore){}
            return;
        }

        // Phase 1: water master missions (skip entirely if none open)
        if(!anyOpenWaterMission()) return;
        var team = Vars.player.team();
        var px = Vars.player.tileX();
        var py = Vars.player.tileY();
        // Small radius, sparse samples
        for(var dx = -6; dx <= 6; dx += 3){
            for(var dy = -6; dy <= 6; dy += 3){
                var t = Vars.world.tile(px + dx, py + dy);
                if(t == null || t.build == null) continue;
                if(t.build.team !== team) continue;
                try{
                    var liq = t.build.liquids;
                    if(liq != null && liq.get(Liquids.water) > 0.05){
                        bumpMasterMission("water", ""+t.build.block.name, 1);
                    }
                }catch(eW){}
            }
        }
    }catch(err){}
});

Events.on(WorldLoadEvent, function(){
    lastCoreItemsTotal = -1;
    lastMissionScanTick = 0;
});



Events.on(WorldLoadEvent, function(){
    try{
        Timer.schedule(function(){
            try{ ensurePointSystems(); tryGrantDailyBonus(); }catch(e){}
        }, 1.5);
    }catch(e){}
});
