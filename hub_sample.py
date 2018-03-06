import time
import requests 
import sys

# Logs newest sensor data to cloud database using HTTP GET request
# @param get_req - String of key/values to log in HTTP GET format
def cloud_log(get_req):
	web_hook = "https://sample-database.appspot.com/insert"
	try:
		requests.get(web_hook + get_req)
	except:
		print("Unable to connect to ", web_hook)

# Converts data from dictionary to an HTTP GET string
# @param data - dictionary of data with associated tags
def data_to_get(data):
	req = '?'
	for key in data:
		req += key + '=' + data[key] + '&'
	return req[:len(req) - 1]

'''
TODO: shortest path tree of mesh network
'''

def fetch_repl(fetch_int):
	'''
	TODO: set up ZigBee comms
			- ???
	'''
	while True:
		node_data = {} 
		'''
		TODO: Fetch from nodes
				- Construct relay order
				- Get data
				- Put into node_data dictionary
		'''
		cloud_log(data_to_get(node_data))
		time.sleep(fetch_int)

def main():
	if sys.argc != 2:
		print("Usage: python3 hub_sample.py <fetch interval (seconds)>")
		return
	fetch_int = sys.argv[1]
	err = fetch_repl(fetch_int)
	if err:
		print("Fetching terminated with error")
	else
		print("Fetching terminated without error")


if __name__ == '__main__':
	main()