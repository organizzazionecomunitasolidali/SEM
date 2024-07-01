import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import ProcessView from './ProcessView';
import TaskView from './TaskView';
import OpenaiCompletionsView from './OpenaiCompletionsView';
import ClearTableDataDialog from './ClearTableDataDialog';
import {
  SERVER_BASE_URL,
  CONTROLLER_SERVICE_OPENAI_ID,
  CONTROLLER_SERVICE_OPENAI_GET_PRODUCT_STRUCTURE,
  CONTROLLER_SERVICE_OPENAI_GET_FUNCTIONS,
  CONTROLLER_PROCESS_ID,
  CONTROLLER_OPENAI_COMPLETIONS_ID,
  CONTROLLER_HTML_ELEMENT_STRUCTURE_ID,
  CONTROLLER_WEBSITE_ID,
  CONTROLLER_WEBSITE_COUNTERS,
  HTML_ELEMENT_TYPE_PRODUCT,
  HTML_ELEMENT_TYPE_PAGINATION,
} from '../utils/globals';
import { DateTime } from 'luxon';

// import ReactTabulatorExample from './ReactTabulatorExample';

function TaskManager() {
  const navigate = useNavigate();
  const [processData, setProcessData] = useState(null);
  const [taskData, setTaskData] = useState(null);
  // const [productStructureData, setProductStructureData] = useState(null);
  const [openaiCompletionsData, setOpenaiCompletionsData] = useState(null);
  const [openaiServiceFunctionsData, setOpenaiServiceFunctions] =
    useState(null);
  // const [pids, setPids] = useState(null);
  const [clearTableDataDialogOpen, setClearTableDataDialogOpen] =
    useState(false);
  const [productUpdateWeeklyData, setProductUpdateWeeklyData] =
    useState(false);
  // const clearTableDataDialogItems = ['Item 1', 'Item 2', 'Item 3'];

  useEffect(() => {
    async function fetchData() {
      try {
        const processResponse = await fetch(
          SERVER_BASE_URL + CONTROLLER_PROCESS_ID,
        );
        if (!processResponse.ok) {
          throw new Error(
            'Network response was not ok ' + processResponse.statusText,
          );
        }
        let processResponseJson = await processResponse.json();

        processResponseJson = processResponseJson.map((obj) => {
          // Convert timestamps to DateTime objects
          const lastStartDateTime = DateTime.fromMillis(obj.last_start);
          const lastEndDateTime = DateTime.fromMillis(obj.last_end);

          // Calculate the difference
          const duration = lastEndDateTime.diff(lastStartDateTime);

          let formattedDuration = '';
          let formattedLastStart = '';
          if (obj.last_start > 0) {
            // Convert the difference to a Duration and format it
            formattedDuration = duration.toFormat('hh:mm:ss:SSS');

            formattedLastStart = DateTime.fromMillis(obj.last_start).toFormat(
              'yyyy-MM-dd HH:mm:ss',
            );
          }

          return {
            ...obj,
            last_start_datetime: formattedLastStart,
            duration: formattedDuration,
          };
        });

        console.log(
          'TaskManager processDataResponseJson: ',
          processResponseJson,
        );
        setProcessData(processResponseJson);

        const htmlElementStructureResponse = await fetch(
          SERVER_BASE_URL + CONTROLLER_HTML_ELEMENT_STRUCTURE_ID,
          // + '?type=' +
          // HTML_ELEMENT_TYPE_PRODUCT,
        );
        if (!htmlElementStructureResponse.ok) {
          throw new Error(
            'Network response was not ok ' +
              htmlElementStructureResponse.statusText,
          );
        }
        let htmlElementStructureResponseJson =
          await htmlElementStructureResponse.json();
        console.log(
          'TaskManager htmlElementStructureResponseJson: ',
          htmlElementStructureResponseJson,
        );
        // setProductStructureData(htmlElementStructureResponseJson);

        // const lastId = data[data.length - 1].id;
        // console.log('ProcessView lastId: ', lastId);
        // setLastId(lastId);
        let tasks = [];
        let pidsArray = [];
        let tasksResponse;
        let tasksResponseJson;
        for (const process of processResponseJson) {
          tasksResponse = null;
          tasksResponseJson = null;

          pidsArray.push(process.id);

          tasksResponse = await fetch(
            SERVER_BASE_URL + CONTROLLER_PROCESS_ID + '/' + process.id,
          );
          if (!tasksResponse.ok) {
            throw new Error(
              'Network response was not ok ' + tasksResponse.statusText,
            );
          }
          tasksResponseJson = await tasksResponse.json();
          console.log('TaskManager tasksResponseJson: ', tasksResponseJson);

          const updatedWebsites = tasksResponseJson.websites.map(
            (obj, index) => {
              let formattedLastStart = '';
              if (obj.last_start > 0) {
                formattedLastStart = DateTime.fromMillis(
                  obj.last_start,
                ).toFormat('yyyy-MM-dd HH:mm:ss');
              }

              let productStructure = '';

              const htmlElementStructureProduct =
                htmlElementStructureResponseJson.find(
                  (record) =>
                    record.website &&
                    record.website.id === obj.id &&
                    record.type === HTML_ELEMENT_TYPE_PRODUCT,
                );
              if (htmlElementStructureProduct) {
                const productStructureJSON = {
                  id: htmlElementStructureProduct.id,
                  selector: htmlElementStructureProduct.selector,
                  json: htmlElementStructureProduct.json,
                };
                productStructure = JSON.stringify(productStructureJSON);
              }

              let paginationStructure = '';

              const htmlElementStructurePagination =
                htmlElementStructureResponseJson.find(
                  (record) =>
                    record.website &&
                    record.website.id === obj.id &&
                    record.type === HTML_ELEMENT_TYPE_PAGINATION,
                );
              if (htmlElementStructurePagination) {
                const productStructureJSON = {
                  id: htmlElementStructurePagination.id,
                  selector: htmlElementStructurePagination.selector,
                  json: htmlElementStructurePagination.json,
                };
                paginationStructure = JSON.stringify(productStructureJSON);
              }

              return {
                ...obj,
                pid: process.id,
                last_start_datetime: formattedLastStart,
                progress: (obj.last_page / obj.num_pages) * 100,
                product_structure: productStructure,
                pagination_structure: paginationStructure,
              };
            },
          );
          // if (
          //   Array.isArray(tasks) &&
          //   Array.isArray(tasksResponseJson.websites)
          // ) {
          tasks = tasks.concat(updatedWebsites);
          // tasks([...tasks, ...tasksResponseJson.websites]);
          // } else {
          //   console.error('One of the objects is not an array');
          // }
          // console.log('TaskManager tasks: ', tasks);
        }

        console.log('TaskManager tasks: ', tasks);
        setTaskData(tasks);
        // setPids(pidsArray);

        const openaiCompletionsResponse = await fetch(
          SERVER_BASE_URL + CONTROLLER_OPENAI_COMPLETIONS_ID,
        );
        if (!openaiCompletionsResponse.ok) {
          throw new Error(
            'Network response was not ok ' +
              openaiCompletionsResponse.statusText,
          );
        }
        const openaiCompletionsResponseJson =
          await openaiCompletionsResponse.json();
        console.log(
          'TaskManager openaiCompletionsResponseJson: ',
          openaiCompletionsResponseJson,
        );
        setOpenaiCompletionsData(openaiCompletionsResponseJson);

        const openaiServiceFunctionsResponse = await fetch(
          SERVER_BASE_URL +
            CONTROLLER_SERVICE_OPENAI_ID +
            '/' +
            CONTROLLER_SERVICE_OPENAI_GET_FUNCTIONS,
        );
        if (!openaiServiceFunctionsResponse.ok) {
          throw new Error(
            'Network response was not ok ' +
              openaiServiceFunctionsResponse.statusText,
          );
        }
        const openaiServiceFunctionsResponseJson =
          await openaiServiceFunctionsResponse.json();
        console.log(
          'TaskManager openaiServiceFunctionsResponseJson: ',
          openaiServiceFunctionsResponseJson,
        );

        setOpenaiServiceFunctions(openaiServiceFunctionsResponseJson);
          
        const counterResponse = await fetch(
          SERVER_BASE_URL + CONTROLLER_WEBSITE_ID + '/' + CONTROLLER_WEBSITE_COUNTERS,
        );
        if (!counterResponse.ok) {
          throw new Error(
            'counterResponse: Network response was not ok ' + counterResponse.statusText,
          );
        }
        const counterResponseJson = await counterResponse.json();
        console.log('TaskManager counterResponseJson: ', counterResponseJson);
        setProductUpdateWeeklyData(counterResponseJson);
        
      } catch (error) {
        console.error(
          'There has been a problem with your fetch operation:',
          error,
        );
      }
    }

    fetchData();
  }, []);

  const handleBack = () => {
    navigate('/'); // Navigate back to the home page
  };

  // Callback function for ProcessView to update sharedData
  const handleProcessDataUpdate = (updatedProcessData) => {
    // setProcessData(updatedProcessData);
    setProcessData([...updatedProcessData]);
  };

  const handleClearTableDataDialogOpen = () => {
    setClearTableDataDialogOpen(true);
  };

  const handleClearTableDataDialogClose = () => {
    setClearTableDataDialogOpen(false);
  };

  if (processData === null) {
    return <div>Loading...</div>;
  }

  const clearTableDataFlashMessageDivId = 'fixtures-flash-message';

  return (
    <div>
      <div class="task-manager-header-container">
        <h1>Task Manager</h1>
        <Button onClick={handleBack} variant="contained" color="primary">
          Back to Home
        </Button>
      </div>
      {processData && (
        <ProcessView
          processData={processData}
          onProcessDataUpdate={handleProcessDataUpdate}
        />
      )}
      {processData && taskData && (
        <TaskView
          processData={processData} //pids={pids}
          taskData={taskData}
          // productStructureData={productStructureData}
        />
      )}
      {openaiCompletionsData && taskData && openaiServiceFunctionsData && (
        <OpenaiCompletionsView
          openaiCompletionsData={openaiCompletionsData}
          taskData={taskData}
          openaiServiceFunctionsData={openaiServiceFunctionsData}
        />
      )}
      <div>
        <div id={clearTableDataFlashMessageDivId}></div>
        <Button
          variant="contained"
          color="error"
          onClick={handleClearTableDataDialogOpen}
        >
          Clear Table Data
        </Button>
        <ClearTableDataDialog
          open={clearTableDataDialogOpen}
          handleClose={handleClearTableDataDialogClose}
          flashMessageDivId={clearTableDataFlashMessageDivId}
          // items={clearTableDataDialogItems}
        />
      </div>
      {productUpdateWeeklyData && (
      <div style={{marginTop: "50px"}}>
        <h2 style={{fontWeight: 900, marginLeft: '20px'}}>Product update stats per week and website</h2>
        {productUpdateWeeklyData.map((item,index) => (
        <div style={{marginTop: '20px', marginLeft: '20px', display: 'inline-block'}}>
          <h4 style={{fontWeight: 900, margin: '0px', padding: '5px', background: index==0 ? '#ffffac' : 'transparent',  color: index==0 ? '#222' : 'black' }}>{index==0 ? "This" : ""} Week {item.week}</h4>
          <table border="0">
            <thead>
              <tr style={{backgroundColor: 'black', color: 'white', margin: '0px', padding: '5px'}}>
                <th style={{padding: '5px'}}>Site</th>
                <th style={{padding: '5px'}}>Products added</th>
                <th style={{padding: '5px'}}>Products deleted</th>
              </tr>
            </thead>
            <tbody>
            {item.stats.map((stats,ind) => (
              <tr style={{margin: '0px', backgroundColor: (ind % 2) ? '#ccc' : '#ddd', padding: '5px'}}>
                <td style={{padding: '5px'}}>{stats.site}</td>
                <td style={{padding: '5px'}}>{stats.added}</td>
                <td style={{padding: '5px'}}>{stats.deleted}</td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
        ))}
      </div>
      )}
    </div>
  );
}

export default TaskManager;
