function loadDataFile(e){
    var reader = new FileReader();
    reader.onload = function(evt) {
        var lines = evt.target.result.split('\n');
        loadData(e, lines);
    };
    reader.readAsText(e.data.selectedFile);
}

function loadData(e, lines) {
    var entries = 0;
    var maxKey = -2147483648;
    var maxValue = -2147483648;

    var isValid = true;
    var keySize = "";
    var valueSize = "";
    var entrySize = "";

    var keyHash = e.data.keyHash;
    var frequencyKeys = [];

    var percentage = 0;
    
    for(var i = 0; i < lines.length; i++){
        var line = lines[i];

        if(line != "") {
            entries += 1;

            var entry = line.split(" ");

            if(!(entry.length == 2 && !entry.some(isNaN)) &&
               !(entry.length == 3 && !(isNaN(entry[1]))  && !(isNaN(entry[2])))) {
                entries = "";
                isValid = false;
                break;
            }

            var key, value;

            if(entry.length == 2) {
                key = Number(entry[0]);
                value = Number(entry[1]);
            } else {
                key = Number(entry[1]);
                value = Number(entry[2]);
            }

            maxKey = Math.max(maxKey, key);
            maxValue = Math.max(maxValue, value);

            if (undefined == keyHash["" + key]) {
                keyHash["" + key] = 1;
            } else {
                keyHash["" + key] += 1;
            }
        }         

        var per = Math.ceil((i+1) / lines.length * 1000) / 10;
        per = Math.max(0.1, per);
        per = Math.min(99.7, per);

        if(per != percentage) {
            percentage = per;
            postMessage({msg: "percentage", percentage: percentage});
        }
    }

    for (const property in keyHash) {
        frequencyKeys.push({key: Number(property), frequency: keyHash[property]});
    }
    frequencyKeys.sort(function(a,b){return a.key - b.key;});
    var uParameters = highestFrequencyPartitions(frequencyKeys);
    uParameters['U'] = maxKey * 100;

    if(isValid) {
        keySize = Math.ceil(Math.log2(maxKey)/8);
        valueSize = Math.ceil(Math.log2(maxValue)/8);
        entrySize = keySize + valueSize;
    } else {
        postMessage({msg: "invalid"});
    }
    
    // Update the inputs
    postMessage({msg: "inputs", entries: entries, entrySize: entrySize, keySize: keySize, fileName: e.data.selectedFile.name, keyHash: keyHash, uParameters: uParameters});
}

// To calculate U1 and U2:
//  find partitions with highest frequency with an array of entries as input
// 	 1. divide it into M partitions
// 	 2. for each partition calculate the average frequency
// 	 3. return the partitions with the highest frequency
//   4. calculate U1 and then U2
function highestFrequencyPartitions(entries) {

    // for(var entry of entries) {
    //     console.log(JSON.stringify(entry));
    // }

    var min = entries[0].key;
    var max = entries[entries.length - 1].key;
    var M = (max - min)/100;
    var partitionRange = 100;
    var partitions = [];
    var entriesIndex = 0;

    // Partition:
    //  start point
    //  end point
    //  number of keys
    //  total frequency
    const START_POINT = 0;
    const END_POINT = 1;
    const NUMBER_KEYS = 2;
    const TOTAL_FREQUENCY = 3;
    for(var i = 0; i < M - 1; i++) {
        partitions[i] = [0, 0, 0, 0];
        var startPoint = i * partitionRange;
        var endPoint = (i + 1) * partitionRange;
        var numberKeys = 0;
        var totalFrequency = 0;
        while(entriesIndex < entries.length && startPoint <= entries[entriesIndex].key && entries[entriesIndex].key  < endPoint) {
            numberKeys++;
            totalFrequency += entries[entriesIndex].frequency;
            entriesIndex++; 
        }
        partitions[i][START_POINT] = startPoint;
        partitions[i][END_POINT] = endPoint;
        partitions[i][NUMBER_KEYS] = numberKeys;
        partitions[i][TOTAL_FREQUENCY] = totalFrequency;
    }
    partitions[M - 1] = [0, 0, 0, 0];
    var startPoint = (M - 1) * partitionRange;
    var endPoint = M * partitionRange;
    var numberKeys = 0;
    var totalFrequency = 0;
    while(entriesIndex < entries.length) {
        numberKeys++;
        totalFrequency += entries[entriesIndex].frequency;
        entriesIndex++; 
    }
    partitions[M - 1][START_POINT] = startPoint;
    partitions[M - 1][END_POINT] = endPoint;
    partitions[M - 1][NUMBER_KEYS] = numberKeys;
    partitions[M - 1][TOTAL_FREQUENCY] = totalFrequency;

    partitions = removeEmptyPartitions(partitions);

    // Sort array by average frequencies
    partitions.sort(function(a,b){return (b[TOTAL_FREQUENCY] / b[NUMBER_KEYS]) - (a[TOTAL_FREQUENCY] / a[NUMBER_KEYS]);});

    var minAvg = Number.MAX_VALUE;
    var maxAvg = 0;
    var avgAvg = 0;
    for(var partition of partitions) {
        var avg = (partition[TOTAL_FREQUENCY] / partition[NUMBER_KEYS]);
        minAvg = Math.min(minAvg, avg);
        maxAvg = Math.max(maxAvg, avg);
        avgAvg += avg;
    }
    avgAvg /= M;
    console.log("min: " + minAvg + " avg: " + avgAvg + ", max: " + maxAvg);

    var start = max;
    var end = min;
    var avgFrequency = partitions[0][TOTAL_FREQUENCY] / partitions[0][NUMBER_KEYS];
    var minFrequency = 70; //
    for(var i = 0; i < partitions.length && avgFrequency > minFrequency; i++) {
        console.log(i + ". " + partitions[i][START_POINT] + ", " + partitions[i][END_POINT]); //
        start = Math.min(start, partitions[i][START_POINT]);
        end = Math.max(end, partitions[i][END_POINT]);
        avgFrequency = partitions[i+1][TOTAL_FREQUENCY] / partitions[i+1][NUMBER_KEYS];
    }
    U_1 = end - start;
    U_2 = (max - min) - U_1;
    console.log(start + ", " + end + ": U1 = " + U_1 + " U2 = " + U_2); //

    return {U_1: U_1, U_2: U_2};
}

function removeEmptyPartitions(partitions) {
    var newPartitions = [];
    for(var partition of partitions) {
        if(partition[2] != 0) {
            newPartitions.push(partition);
        }
    }
    return newPartitions;
}

onmessage = function(e) {
    loadDataFile(e);
}