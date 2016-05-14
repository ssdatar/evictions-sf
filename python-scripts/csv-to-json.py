import csv
import json

evict_dict = {}
master_list = []

#open csv file to read in
with open('../data/ev-filtered.csv', 'r') as csvfile:
    #open json file to write to
    with open('../data/eviction-final.json', 'w') as json_out:
        reader = csv.reader(csvfile)
        next(reader, None) #skip header row

        #read each row as a list of data
        for row in reader:
          # Split location into two numbers
          temp = row[-2].replace('(','').replace(')','').split(',')

          # Some locations are empty, so ensure it is a two-element list
          if temp[0] == '':
            temp = ['','']

          #make a dict for this row
          evict_dict = {'eviction_id': row[0],
                        'address': row[1],
                        'zip': row[5],
                        'date': row[6],
                        'year': row[4],
                        'reason': row[-1],
                        'lat': temp[0],
                        'long': temp[1],
                        'supervisor_district': row[-4],
                        'neighborhood': row[-3] }
          
          #append this row to master list
          master_list.append(evict_dict)
            
        #write the master list to a json file
        json_data = json.dumps(master_list, indent=2)
        json_out.write(json_data)