import React, { useEffect, useReducer } from 'react';
import uuid from 'uuid/v4';
import { withAuthenticator } from 'aws-amplify-react';

import './App.css';

import { listTalks as LIST_TALKS } from './graphql/queries';
import { createTalk as CREATE_TALK } from './graphql/mutations';
import { deleteTalk as DeleteTalk } from './graphql/mutations';
import { onCreateTalk } from './graphql/subscriptions';
import { API, graphqlOperation } from 'aws-amplify';
const CLIENT_ID = uuid();

const initialsState = {
	name: '',
	description: '',
	speakerName: '',
	speakerBio: '',
	talks: [],
	errors: []
};
const SET_TALKS = 'SET_TALKS';
const SET_INPUT = 'SET_INPUT';
const CLEAR_INPUT = 'CLEAR_INPUT';
const SET_ERROR = 'SET_ERROR';
const ADD_TALK = 'ADD_TALK';
const REMOVE_TALK = 'REMOVE_TALK';

function reducer(state, action) {
	switch (action.type) {
		case SET_TALKS:
			return {
				...state,
				talks: action.talks
			};
		case REMOVE_TALK: {
			return {
				...state,
				talks: [ ...state.talks ].filter((k) => k.id !== action.talkId)
			};
		}
		case SET_ERROR:
			return {
				...state,
				errors: [ ...state.error, action.error ]
			};
		case SET_INPUT:
			return {
				...state,
				[action.key]: action.value
			};
		case CLEAR_INPUT:
			return { ...initialsState, talks: state.talks };
		case ADD_TALK:
			return {
				...state,
				talks: [ ...state.talks, action.talk ]
			};
		default:
			return state;
	}
}
function App() {
	const [ state, dispatch ] = useReducer(reducer, initialsState);

	useEffect(() => {
		getData();
		const subscription = API.graphql(graphqlOperation(onCreateTalk)).subscribe({
			next: (eventData) => {
				console.log('TCL: App -> eventData', eventData);
				const talk = eventData.value.data.onCreateTalk;
				if (talk.clientId === CLIENT_ID) return;
				dispatch({ type: ADD_TALK, talk });
			}
		});

		console.log('TCL: App -> subscription', subscription);
		return () => subscription.unsubscribe();
	}, []);

	const deleteTalk = async (id) => {
		try {
			const data = await API.graphql(graphqlOperation(DeleteTalk, { input: { id } }));
			console.log('TCL: deleteTalk -> data', data);

			dispatch({ type: REMOVE_TALK, talkId: id });
		} catch (error) {
			console.log('TCL: deleteTalk -> error', error.message);
		}
	};

	const createTalk = async () => {
		const { name, description, speakerName, speakerBio } = state;

		if (name === '' || description === '' || speakerName === '' || speakerBio === '') {
			return;
		}

		const newTalk = { name, description, speakerName, speakerBio, clientId: CLIENT_ID };
		const talks = [ ...state.talks, newTalk ];
		dispatch({ type: SET_TALKS, talks });
		dispatch({ type: CLEAR_INPUT });

		try {
			const res = await API.graphql(graphqlOperation(CREATE_TALK, { input: newTalk }));
			console.log('TCL: CREATE_TALK -> res', res.data.createTalk);
		} catch (error) {
			console.log('TCL: CREATE_TALK -> error', error);
		}
	};

	const onChange = (event) => {
		const { name, value } = event.target;
		dispatch({ type: SET_INPUT, key: name, value: value });
	};

	async function getData() {
		try {
			const talkData = await API.graphql(graphqlOperation(LIST_TALKS));
			const talksData = talkData.data.listTalks.items;

			dispatch({ type: SET_TALKS, talks: talksData });
		} catch (error) {
			console.log('TCL: getData -> error', error);
		}
	}

	return (
		<div className="App">
			<div style={{ display: 'flex', flexDirection: 'column', width: '10vw', flexWrap: 'wrap' }}>
				<input
					name="name"
					label="Name"
					placeholder="Enter Name"
					onChange={onChange}
					required
					value={state.name}
				/>

				<input
					name="description"
					placeholder="Enter Description"
					onChange={onChange}
					required
					value={state.description}
				/>

				<input
					name="speakerName"
					placeholder="Enter Speaker Name"
					onChange={onChange}
					required
					value={state.speakerName}
				/>

				<input
					name="speakerBio"
					placeholder="Enter Speaker Bio"
					onChange={onChange}
					required
					type="text"
					value={state.speakerBio}
				/>
				<button onClick={() => createTalk()}>Create Talk</button>
			</div>
			<div style={{ width: '60vw', display: 'flex', justifyContent: 'center', alignContent: 'center' }}>
				{state.talks.map((talk, index) => {
					return (
						<div key={`${index}-${talk.id}`}>
							<h3>{talk.name}</h3>
							<h3>{talk.description}</h3>
							<h3>{talk.speakerName}</h3>
							<button style={{ backgroundColor: '#f65a5f' }} onClick={() => deleteTalk(talk.id)}>
								DELETE
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default withAuthenticator(App, { includeGreetings: true });
