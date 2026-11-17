import {useEffect} from "react";
import {useOnlineSession} from "../lib/online";
import {useApp} from "../lib/context";
import OnlineAccount from '../components/OnlineAccount';
import {PageTitle} from '../components/UI';
export default function SignIn(){const {session}=useOnlineSession(),{navigate}=useApp();useEffect(()=>{if(session)navigate("profile");},[session?.user.id]);return <div className="sign-in-page"><PageTitle title="Sign in"/><OnlineAccount/></div>;}
