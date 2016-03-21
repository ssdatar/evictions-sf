import csv
import json

evict_dict = {}
master_list = []

#open csv file to read in
with open('evictions.csv', 'r') as csvfile:
    #open json file to write to
    with open('evictions.json', 'w') as json_out:
        reader = csv.reader(csvfile)
        next(reader, None) #skip header row

        #read each row as a list of data
        for row in reader:

            #make a dict for this row
            evict_dict = {'eviction_id': row[0],
                          'address': row[1],
                          'zip': row[2],
                          'date': row[3],
                          'year': row[4],
                          'reason': row[5],
                          'lat': row[6],
                          'long': row[7],
                          'supervisor_district': row[8],
                          'neighborhood': row[9] }
            
            #append this row to master list
            master_list.append(evict_dict)
            
        #write the master list to a json file
        json_data = json.dumps(master_list, indent=2)
        json_out.write(json_data)