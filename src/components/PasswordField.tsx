import {useState} from 'react';
import {Eye,EyeOff} from 'lucide-react';
export default function PasswordField({label='Password',autoComplete='current-password',...props}:Omit<React.InputHTMLAttributes<HTMLInputElement>,'type'> & {label?:string}){
 const [visible,setVisible]=useState(false);
 return <div className="field"><label htmlFor={props.id || autoComplete}>{label}</label><div className="password-input"><input {...props} id={props.id || autoComplete} aria-label={label} type={visible?'text':'password'} autoComplete={autoComplete}/><button type="button" className="password-visibility" aria-label={visible?'Hide password':'Show password'} aria-pressed={visible} aria-controls={props.id || autoComplete} onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></div>;
}
